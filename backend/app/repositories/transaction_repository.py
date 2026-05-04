from app.core.database import MongoDB
from app.utils.helpers import utc_now


def serialize_transaction(item: dict) -> dict | None:
    if not item:
        return None

    item.pop("_id", None)
    item.setdefault("category", "sales")
    item.setdefault("payment_method", "cash")
    item.setdefault("description", item.get("transaction_type", "Transaction"))
    item.setdefault("notes", "")
    item.setdefault("date", item.get("created_at", utc_now()))
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