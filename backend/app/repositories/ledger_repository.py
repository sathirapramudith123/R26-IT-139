from app.core.database import MongoDB
from app.utils.helpers import utc_now, generate_id


def serialize_ledger(item: dict) -> dict | None:
    if not item:
        return None
    item.pop("_id", None)
    item.setdefault("category", "sales")
    item.setdefault("payment_method", "cash")
    item.setdefault("source_transaction_id", None)
    item.setdefault("status", "completed")
    return item


class LedgerEntryRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["ledger_entries"]

    async def create(self, payload: dict):
        payload["id"] = generate_id("led")
        payload["created_at"] = utc_now()
        payload["updated_at"] = utc_now()
        await self.collection.insert_one(payload)
        return serialize_ledger(payload)

    async def list_all(self):
        items = []
        async for item in self.collection.find().sort("created_at", -1):
            items.append(serialize_ledger(item))
        return items

    async def get_by_id(self, item_id: str):
        return serialize_ledger(await self.collection.find_one({"id": item_id}))

    async def update(self, item_id: str, payload: dict):
        payload = {k: v for k, v in payload.items() if v is not None}
        payload["updated_at"] = utc_now()
        await self.collection.update_one({"id": item_id}, {"$set": payload})
        return await self.get_by_id(item_id)

    async def delete(self, item_id: str):
        result = await self.collection.delete_one({"id": item_id})
        return result.deleted_count > 0
