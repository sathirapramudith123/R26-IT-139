from app.core.database import MongoDB
from app.utils.helpers import utc_now


def serialize_transaction(item: dict) -> dict | None:
    if not item:
        return None

    item.pop("_id", None)

    item.setdefault("transaction_type", "sale")
    item["transaction_type"] = str(item["transaction_type"]).strip().lower()

    item.setdefault("category", "sales")
    item["category"] = str(item["category"]).strip().lower()

    item.setdefault("payment_method", "cash")
    item["payment_method"] = str(item["payment_method"]).strip().lower()

    item.setdefault("description", "Transaction")
    item.setdefault("date", item.get("created_at") or utc_now())
    item.setdefault("status", "completed")
    item["status"] = str(item["status"]).strip().lower()

    item.setdefault("notes", "")
    item.setdefault("created_at", utc_now())
    item.setdefault("updated_at", utc_now())

    return item


class TransactionRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["transactions"]

    async def create(self, payload: dict):
        await self.collection.insert_one(payload)
        return serialize_transaction(payload)

    async def list_all(self):
        items = []
        async for item in self.collection.find().sort("created_at", -1):
            items.append(serialize_transaction(item))
        return items

    async def get_by_id(self, item_id: str):
        item = await self.collection.find_one({"id": item_id})
        return serialize_transaction(item)

    async def update(self, item_id: str, payload: dict):
        payload["updated_at"] = utc_now()

        await self.collection.update_one(
            {"id": item_id},
            {"$set": payload},
        )

        return await self.get_by_id(item_id)

    async def delete(self, item_id: str):
        result = await self.collection.delete_one({"id": item_id})
        return result.deleted_count > 0

    async def patch_missing_fields(self):
        await self.collection.update_many(
            {"category": {"$exists": False}},
            {"$set": {"category": "sales"}},
        )

        await self.collection.update_many(
            {"payment_method": {"$exists": False}},
            {"$set": {"payment_method": "cash"}},
        )

        await self.collection.update_many(
            {"description": {"$exists": False}},
            {"$set": {"description": "Transaction"}},
        )

        await self.collection.update_many(
            {"date": {"$exists": False}},
            {"$set": {"date": utc_now()}},
        )

        await self.collection.update_many(
            {"notes": {"$exists": False}},
            {"$set": {"notes": ""}},
        )