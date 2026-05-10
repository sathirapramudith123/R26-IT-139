from app.core.database import MongoDB
from app.utils.helpers import utc_now


def serialize_procurement(item: dict) -> dict | None:
    if not item:
        return None
    item.pop("_id", None)
    item.setdefault("item_name", "")
    item.setdefault("quantity", None)
    item.setdefault("delivery_location", None)
    item.setdefault("required_delivery_date", None)
    item.setdefault("expected_selling_price", None)
    item.setdefault("selected_supplier_id", None)
    item.setdefault("selected_supplier_name", None)
    item.setdefault("unit_price", 0)
    item.setdefault("delivery_cost", 0)
    item.setdefault("total_cost", 0)
    item.setdefault("estimated_profit", 0)
    item.setdefault("final_score", 0)
    item.setdefault("decision_type", "rule_based")
    item.setdefault("status", "pending")
    return item


class ProcurementRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["procurements"]

    async def create(self, payload: dict):
        await self.collection.insert_one(payload)
        return serialize_procurement(payload)

    async def list_all(self):
        items = []
        async for item in self.collection.find().sort("created_at", -1):
            items.append(serialize_procurement(item))
        return items

    async def get_by_id(self, item_id: str):
        return serialize_procurement(await self.collection.find_one({"id": item_id}))

    async def update(self, item_id: str, payload: dict):
        payload["updated_at"] = utc_now()
        await self.collection.update_one({"id": item_id}, {"$set": payload})
        return await self.get_by_id(item_id)

    async def delete(self, item_id: str):
        result = await self.collection.delete_one({"id": item_id})
        return result.deleted_count > 0

    async def patch_missing_fields(self):
        fields = ["quantity", "delivery_location", "required_delivery_date",
                  "expected_selling_price", "selected_supplier_id", "selected_supplier_name"]
        for field in fields:
            await self.collection.update_many({field: {"$exists": False}}, {"$set": {field: None}})
