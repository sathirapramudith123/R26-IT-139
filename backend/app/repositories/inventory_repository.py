from app.core.database import MongoDB
from app.utils.helpers import utc_now


def serialize_inventory_item(item: dict) -> dict | None:
    if not item:
        return None
    item.pop("_id", None)
    item.setdefault("supplier_id", "")
    item.setdefault("supplier_name", "Unknown Supplier")
    item.setdefault("unit", "unit")
    item.setdefault("reorder_level", 0)
    return item


class InventoryItemRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["inventory_items"]

    async def create(self, payload: dict):
        await self.collection.insert_one(payload)
        return serialize_inventory_item(payload)

    async def list_all(self):
        items = []
        async for item in self.collection.find().sort("created_at", -1):
            items.append(serialize_inventory_item(item))
        return items

    async def get_by_id(self, item_id: str):
        return serialize_inventory_item(await self.collection.find_one({"id": item_id}))

    async def get_by_name(self, name: str):
        item = await self.collection.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
        return serialize_inventory_item(item)

    async def update(self, item_id: str, payload: dict):
        payload["updated_at"] = utc_now()
        await self.collection.update_one({"id": item_id}, {"$set": payload})
        return serialize_inventory_item(await self.collection.find_one({"id": item_id}))

    async def delete(self, item_id: str):
        result = await self.collection.delete_one({"id": item_id})
        return result.deleted_count > 0

    async def patch_missing_fields(self):
        defaults = {"supplier_id": "", "supplier_name": "Unknown Supplier",
                    "unit": "unit", "reorder_level": 0, "sync_status": "synced", "version": 1}
        for field, value in defaults.items():
            await self.collection.update_many({field: {"$exists": False}}, {"$set": {field: value}})
