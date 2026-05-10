from app.core.database import MongoDB
from app.utils.helpers import utc_now


def serialize_supplier(item: dict) -> dict | None:
    if not item:
        return None
    item.pop("_id", None)
    item.setdefault("company_name", "N/A")
    item.setdefault("email", "N/A")
    item.setdefault("address", "")
    item.setdefault("status", "active")
    item.setdefault("price_score", 0)
    item.setdefault("reliability_score", 0)
    item.setdefault("delivery_score", 0)
    item.setdefault("total_score", 0)
    item.setdefault("unit_price", 0)
    item.setdefault("delivery_cost", 0)
    item.setdefault("available_quantity", 0)
    item.setdefault("estimated_delivery_date", None)
    return item


class SupplierRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["suppliers"]

    async def create(self, payload: dict):
        await self.collection.insert_one(payload)
        return serialize_supplier(payload)

    async def list_all(self):
        items = []
        async for item in self.collection.find().sort("created_at", -1):
            items.append(serialize_supplier(item))
        return items

    async def get_by_id(self, item_id: str):
        return serialize_supplier(await self.collection.find_one({"id": item_id}))

    async def get_by_name(self, name: str):
        item = await self.collection.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
        return serialize_supplier(item)

    async def update(self, item_id: str, payload: dict):
        payload["updated_at"] = utc_now()
        await self.collection.update_one({"id": item_id}, {"$set": payload})
        return serialize_supplier(await self.collection.find_one({"id": item_id}))

    async def delete(self, item_id: str):
        result = await self.collection.delete_one({"id": item_id})
        return result.deleted_count > 0

    async def patch_missing_fields(self):
        defaults = {"company_name": "N/A", "email": "N/A", "address": "", "status": "active",
                    "price_score": 0, "reliability_score": 0, "delivery_score": 0, "total_score": 0,
                    "unit_price": 0, "delivery_cost": 0, "available_quantity": 0, "estimated_delivery_date": None}
        for field, value in defaults.items():
            await self.collection.update_many({field: {"$exists": False}}, {"$set": {field: value}})
