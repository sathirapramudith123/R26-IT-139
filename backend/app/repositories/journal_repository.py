from app.core.database import MongoDB
from app.utils.helpers import generate_id, utc_now


def serialize_journal(item: dict) -> dict | None:
    if not item:
        return None
    item.pop("_id", None)
    return item


class JournalEntryRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["journal_entries"]

    # ── Create ────────────────────────────────────────────────────────────────

    async def create(self, payload: dict) -> dict:
        payload["id"] = generate_id("jnl")
        payload["created_at"] = utc_now()
        await self.collection.insert_one(payload)
        return serialize_journal(payload)

    # ── List (user-scoped, paginated) ─────────────────────────────────────────

    async def list_all(self) -> list[dict]:
        """Return all journal entries (admin / ledger view)."""
        items = []
        async for item in self.collection.find().sort("created_at", -1):
            items.append(serialize_journal(item))
        return items

    async def get_all(self, user_id: str, skip: int = 0, limit: int = 50) -> list[dict]:
        """Return paginated journal entries for a specific user."""
        items = []
        cursor = (
            self.collection
            .find({"user_id": user_id})
            .sort("date", -1)
            .skip(skip)
            .limit(limit)
        )
        async for item in cursor:
            items.append(serialize_journal(item))
        return items

    # ── Single-record lookups ─────────────────────────────────────────────────

    async def get_by_reference(self, reference_id: str) -> list[dict]:
        """Legacy lookup by reference_id field."""
        items = []
        async for item in self.collection.find({"reference_id": reference_id}):
            items.append(serialize_journal(item))
        return items

    async def get_by_transaction_id(self, transaction_id: str) -> dict | None:
        """Return the journal entry linked to a transaction."""
        item = await self.collection.find_one({"transaction_id": transaction_id})
        return serialize_journal(item)

    # ── Update ────────────────────────────────────────────────────────────────

    async def update_by_transaction_id(self, transaction_id: str, data: dict) -> dict | None:
        """Update the journal entry linked to a transaction."""
        data["updated_at"] = utc_now()
        await self.collection.update_one(
            {"transaction_id": transaction_id},
            {"$set": data},
        )
        return await self.get_by_transaction_id(transaction_id)

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete_by_reference(self, reference_id: str) -> None:
        """Legacy bulk delete by reference_id."""
        await self.collection.delete_many({"reference_id": reference_id})

    async def delete_by_transaction_id(self, transaction_id: str) -> bool:
        """Delete the journal entry linked to a transaction."""
        result = await self.collection.delete_one({"transaction_id": transaction_id})
        return result.deleted_count > 0
