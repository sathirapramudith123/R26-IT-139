"""
SyncService — offline operation replay engine.

When the merchant regains network connectivity the frontend calls
POST /sync with a list of operations that were performed while offline.

This service:
  1. Accepts the batch
  2. Saves any new items to the queue
  3. Replays every pending item in client_timestamp order
  4. Marks each item synced / conflict / failed
  5. Returns a full result report

Supported modules:  inventory | transaction | agency_banking | supplier
Supported ops:      create | update | delete
"""

from datetime import datetime
from typing import Any

from app.models.sync_model import SyncQueueItem
from app.repositories.sync_repository import SyncRepository
from app.utils.helpers import utc_now


# ── Module handlers ───────────────────────────────────────────────────────────
# Each handler is a small async function that executes one operation.
# They are resolved at call-time to avoid circular imports.

async def _handle_inventory(operation: str, payload: dict, record_id: str | None) -> str:
    from app.services.inventory_service import InventoryItemService
    svc = InventoryItemService()

    if operation == "create":
        result = await svc.create(payload)
        return result["id"]

    if operation == "update":
        if not record_id:
            raise ValueError("record_id required for update")
        result = await svc.update(record_id, payload)
        return result["id"]

    if operation == "delete":
        if not record_id:
            raise ValueError("record_id required for delete")
        await svc.delete(record_id)
        return record_id

    raise ValueError(f"Unknown operation: {operation}")


async def _handle_transaction(operation: str, payload: dict, record_id: str | None, user_id: str) -> str:
    from app.services.transaction_service import TransactionService
    from app.repositories.transaction_repository import TransactionRepository
    from app.repositories.journal_repository import JournalEntryRepository
    from app.services.journal_service import JournalService
    from app.core.database import MongoDB
    from app.schemas.transaction_schema import TransactionCreate, TransactionUpdate

    db = MongoDB.get_database()
    svc = TransactionService(TransactionRepository(db), JournalService(JournalEntryRepository(db)))

    if operation == "create":
        data = TransactionCreate(**payload)
        result = await svc.create_transaction(user_id, data)
        return result["id"]

    if operation == "update":
        if not record_id:
            raise ValueError("record_id required for update")
        data = TransactionUpdate(**payload)
        result = await svc.update_transaction(record_id, user_id, data)
        return result["id"]

    if operation == "delete":
        if not record_id:
            raise ValueError("record_id required for delete")
        await svc.delete_transaction(record_id, user_id)
        return record_id

    raise ValueError(f"Unknown operation: {operation}")


async def _handle_agency_banking(operation: str, payload: dict, record_id: str | None) -> str:
    from app.services.agency_banking_service import AgencyBankingService
    svc = AgencyBankingService()

    if operation == "create":
        result = await svc.create(payload)
        return result["id"]

    if operation == "update":
        if not record_id:
            raise ValueError("record_id required for update")
        result = await svc.update(record_id, payload)
        return result["id"]

    if operation == "delete":
        if not record_id:
            raise ValueError("record_id required for delete")
        await svc.delete(record_id)
        return record_id

    raise ValueError(f"Unknown operation: {operation}")


async def _handle_supplier(operation: str, payload: dict, record_id: str | None) -> str:
    from app.services.supplier_service import SupplierService
    svc = SupplierService()

    if operation == "create":
        result = await svc.create(payload)
        return result["id"]

    if operation == "update":
        if not record_id:
            raise ValueError("record_id required for update")
        result = await svc.update(record_id, payload)
        return result["id"]

    if operation == "delete":
        if not record_id:
            raise ValueError("record_id required for delete")
        await svc.delete(record_id)
        return record_id

    raise ValueError(f"Unknown operation: {operation}")


# ── Module dispatcher ─────────────────────────────────────────────────────────

HANDLERS = {
    "inventory":      _handle_inventory,
    "agency_banking": _handle_agency_banking,
    "supplier":       _handle_supplier,
}


async def _dispatch(item: dict, user_id: str) -> str:
    module    = item["module"]
    operation = item["operation"]
    payload   = item.get("payload", {})
    record_id = item.get("record_id")

    if module == "transaction":
        return await _handle_transaction(operation, payload, record_id, user_id)

    handler = HANDLERS.get(module)
    if not handler:
        raise ValueError(f"Unknown module: {module}")

    return await handler(operation, payload, record_id)


# ── SyncService ───────────────────────────────────────────────────────────────

class SyncService:
    def __init__(self):
        self.repo = SyncRepository()

    # ── Ingest offline batch from frontend ────────────────────────────────────

    async def submit_batch(self, user_id: str, operations: list[dict]) -> dict:
        """
        Frontend sends a list of operations done while offline.
        Each item shape:
        {
            "module":           "inventory",
            "operation":        "create",
            "record_id":        "inv_abc123",   # optional — for update/delete
            "payload":          { ...data... },
            "client_timestamp": "2025-05-06T14:30:00Z",
            "device_id":        "device-xyz"    # optional
        }
        """
        if not operations:
            return {"queued": 0, "message": "Nothing to sync"}

        items = []
        for op in operations:
            # Skip if already queued (idempotency — frontend might retry submit)
            existing = await self.repo.collection.find_one({
                "user_id":   user_id,
                "module":    op.get("module"),
                "operation": op.get("operation"),
                "record_id": op.get("record_id"),
                "client_timestamp": op.get("client_timestamp"),
            })
            if existing:
                continue

            item = SyncQueueItem(
                user_id=          user_id,
                module=           op["module"],
                operation=        op["operation"],
                record_id=        op.get("record_id"),
                payload=          op.get("payload", {}),
                client_timestamp= _parse_ts(op.get("client_timestamp")),
                device_id=        op.get("device_id"),
            )
            items.append(item.model_dump())

        if items:
            await self.repo.create_many(items)

        return {
            "queued":  len(items),
            "skipped": len(operations) - len(items),
            "message": f"{len(items)} operations queued for sync",
        }

    # ── Replay engine ─────────────────────────────────────────────────────────

    async def run_sync(self, user_id: str) -> dict:
        """
        Replay all pending operations for this user in order.
        Returns a detailed result report.
        """
        pending = await self.repo.list_pending(user_id)

        if not pending:
            return {
                "processed": 0,
                "synced":    0,
                "conflicts": 0,
                "failed":    0,
                "results":   [],
                "message":   "Nothing pending — already in sync",
            }

        results   = []
        synced    = 0
        conflicts = 0
        failed    = 0

        for item in pending:
            sync_id = item["id"]
            try:
                server_id = await _dispatch(item, user_id)
                await self.repo.mark_synced(sync_id, server_id)
                results.append({
                    "sync_id":   sync_id,
                    "module":    item["module"],
                    "operation": item["operation"],
                    "status":    "synced",
                    "server_id": server_id,
                })
                synced += 1

            except ConflictError as e:
                await self.repo.mark_conflict(sync_id, str(e))
                results.append({
                    "sync_id":   sync_id,
                    "module":    item["module"],
                    "operation": item["operation"],
                    "status":    "conflict",
                    "reason":    str(e),
                })
                conflicts += 1

            except Exception as e:
                await self.repo.mark_failed(sync_id, str(e))
                results.append({
                    "sync_id":   sync_id,
                    "module":    item["module"],
                    "operation": item["operation"],
                    "status":    "failed",
                    "error":     str(e),
                })
                failed += 1

        return {
            "processed": len(pending),
            "synced":    synced,
            "conflicts": conflicts,
            "failed":    failed,
            "results":   results,
            "message":   (
                f"Sync complete. {synced} synced, "
                f"{conflicts} conflicts, {failed} failed."
            ),
        }

    # ── Status & conflict management ──────────────────────────────────────────

    async def get_status(self, user_id: str) -> dict:
        return await self.repo.get_status_summary(user_id)

    async def get_conflicts(self, user_id: str) -> list[dict]:
        return await self.repo.list_conflicts(user_id)

    async def resolve_conflict(self, user_id: str, sync_id: str, keep: str) -> dict:
        """
        Merchant resolves a conflict:
          keep = "local"  → re-queue the item so it overwrites the server version
          keep = "server" → skip the local version, discard the queued item
        """
        item = await self.repo.get_by_id(sync_id)
        if not item or item["user_id"] != user_id:
            raise ValueError("Sync item not found")

        if keep == "local":
            await self.repo.reset_to_pending(sync_id)
            return {"message": "Re-queued — will overwrite server on next sync"}

        if keep == "server":
            await self.repo.mark_skipped(sync_id, "Merchant chose server version")
            return {"message": "Local version discarded — server version kept"}

        raise ValueError("keep must be 'local' or 'server'")

    async def clear_synced(self, user_id: str) -> dict:
        count = await self.repo.clear_synced(user_id)
        return {"cleared": count, "message": f"Removed {count} synced records"}

    async def get_queue(self, user_id: str) -> list[dict]:
        return await self.repo.list_all_for_user(user_id)


# ── Helpers ───────────────────────────────────────────────────────────────────

class ConflictError(Exception):
    """Raised when a server-side conflict is detected during replay."""
    pass


def _parse_ts(value: Any) -> datetime:
    if not value:
        return utc_now()
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return utc_now()
