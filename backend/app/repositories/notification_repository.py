from app.core.database import MongoDB


def serialize_notification(item: dict) -> dict | None:
    if not item:
        return None

    item.pop("_id", None)
    return item


class NotificationRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["notifications"]

    async def create(self, payload: dict):
        await self.collection.insert_one(payload)
        return serialize_notification(payload)

    async def list_all(self):
        items = []
        async for item in self.collection.find():
            items.append(serialize_notification(item))
        return items

    async def get_by_id(self, item_id: str):
        item = await self.collection.find_one({"id": item_id})
        return serialize_notification(item)