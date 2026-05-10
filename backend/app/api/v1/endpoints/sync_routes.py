"""
Sync API endpoints.

POST   /sync/submit         — frontend submits batch of offline operations
POST   /sync/run            — replay all pending operations (trigger sync)
GET    /sync/status         — pending / synced / conflict / failed counts
GET    /sync/queue          — full queue for this user
GET    /sync/conflicts      — list operations with conflicts needing resolution
POST   /sync/resolve/{id}   — merchant resolves a conflict (keep local or server)
DELETE /sync/clear          — remove all synced records (housekeeping)
"""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from typing import Any, Optional

from app.services.sync_service import SyncService
from app.api.deps import get_current_user

router = APIRouter(prefix="/sync", tags=["sync"])


# ── Request schemas ───────────────────────────────────────────────────────────

class OfflineOperation(BaseModel):
    module: str                          # inventory | transaction | agency_banking | supplier
    operation: str                       # create | update | delete
    record_id: Optional[str] = None     # required for update / delete
    payload: dict[str, Any] = {}        # full data from the merchant's device
    client_timestamp: Optional[str] = None
    device_id: Optional[str] = None


class SubmitBatchRequest(BaseModel):
    operations: list[OfflineOperation]


class ResolveConflictRequest(BaseModel):
    keep: str    # "local" | "server"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/submit", status_code=status.HTTP_202_ACCEPTED)
async def submit_offline_batch(
    body: SubmitBatchRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Frontend calls this when network is restored.
    Submits all operations that were done while offline.
    Operations are queued — not yet replayed.
    Call POST /sync/run afterwards to replay.
    """
    svc = SyncService()
    ops = [op.model_dump() for op in body.operations]
    return await svc.submit_batch(current_user["id"], ops)


@router.post("/run")
async def run_sync(
    current_user: dict = Depends(get_current_user),
):
    """
    Replay all pending offline operations in chronological order.
    Returns a full result report: synced / conflict / failed per operation.
    """
    svc = SyncService()
    return await svc.run_sync(current_user["id"])


@router.get("/status")
async def get_sync_status(
    current_user: dict = Depends(get_current_user),
):
    """
    Returns counts of pending / synced / conflict / failed operations.
    Frontend uses this to show the merchant their sync state.
    """
    svc = SyncService()
    return await svc.get_status(current_user["id"])


@router.get("/queue")
async def get_sync_queue(
    current_user: dict = Depends(get_current_user),
):
    """Full queue history for this user — all statuses."""
    svc = SyncService()
    return await svc.get_queue(current_user["id"])


@router.get("/conflicts")
async def get_conflicts(
    current_user: dict = Depends(get_current_user),
):
    """
    Returns all operations that have conflicts.
    Each conflict means the server data changed while the merchant was offline.
    Merchant must decide: keep their local version or the server version.
    """
    svc = SyncService()
    return await svc.get_conflicts(current_user["id"])


@router.post("/resolve/{sync_id}")
async def resolve_conflict(
    sync_id: str,
    body: ResolveConflictRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Resolve a conflict:
      keep = "local"  → merchant's offline version overwrites server on next sync
      keep = "server" → merchant accepts server version, local change is discarded
    """
    svc = SyncService()
    return await svc.resolve_conflict(current_user["id"], sync_id, body.keep)


@router.delete("/clear")
async def clear_synced_records(
    current_user: dict = Depends(get_current_user),
):
    """Remove all successfully synced records from the queue (housekeeping)."""
    svc = SyncService()
    return await svc.clear_synced(current_user["id"])
