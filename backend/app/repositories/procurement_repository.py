from app.core.database import MongoDB
from app.utils.helpers import utc_now


def serialize_procurement(item: dict) -> dict | None:
    if not item:
        return None

    item.pop("_id", None)

    item.setdefault("item_id", "")
    item.setdefault("item_name", item.get("item_name", "Unknown Item"))

    item.setdefault("current_quantity", item.get("quantity", 0))
    item.setdefault("reorder_level", 10)
    item.setdefault("recommended_quantity", item.get("quantity", 0))

    item.setdefault("recommended_supplier_id", None)
    item.setdefault(
        "recommended_supplier_name",
        item.get("supplier_name", "No supplier")
    )

    item.setdefault("supplier_score", 0)
    item.setdefault("decision_reason", "Legacy procurement record")
    item.setdefault("decision_type", "manual")
    item.setdefault("status", item.get("status", "pending"))

    item.setdefault("created_at", utc_now())
    item.setdefault("updated_at", utc_now())

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
            {"$set": payload}
        )

        return await self.get_by_id(item_id)

    async def delete(self, item_id: str):
        result = await self.collection.delete_one({"id": item_id})
        return result.deleted_count > 0