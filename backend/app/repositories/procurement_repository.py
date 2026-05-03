from app.core.database import MongoDB
from app.utils.helpers import utc_now


def serialize_procurement(item: dict) -> dict | None:
    if not item:
        return None

    item.pop("_id", None)

    # New smart procurement fields
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

    # Backward compatibility for old records
    if not item.get("quantity") and item.get("recommended_quantity") is not None:
        item["quantity"] = item.get("recommended_quantity")

    if not item.get("selected_supplier_id") and item.get("recommended_supplier_id"):
        item["selected_supplier_id"] = item.get("recommended_supplier_id")

    if not item.get("selected_supplier_name") and item.get("recommended_supplier_name"):
        item["selected_supplier_name"] = item.get("recommended_supplier_name")

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
        item = await self.collection.find_one({"id": item_id})
        return serialize_procurement(item)

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
            {"quantity": {"$exists": False}},
            {"$set": {"quantity": None}},
        )
        await self.collection.update_many(
            {"delivery_location": {"$exists": False}},
            {"$set": {"delivery_location": None}},
        )
        await self.collection.update_many(
            {"required_delivery_date": {"$exists": False}},
            {"$set": {"required_delivery_date": None}},
        )
        await self.collection.update_many(
            {"expected_selling_price": {"$exists": False}},
            {"$set": {"expected_selling_price": None}},
        )
        await self.collection.update_many(
            {"selected_supplier_id": {"$exists": False}},
            {"$set": {"selected_supplier_id": None}},
        )
        await self.collection.update_many(
            {"selected_supplier_name": {"$exists": False}},
            {"$set": {"selected_supplier_name": None}},
        )