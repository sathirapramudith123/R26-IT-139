from app.core.database import MongoDB

class TransactionRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["transactions"]

    async def create(self, payload: dict):
        await self.collection.insert_one(payload)
        return payload

    async def list_all(self):
        items = []
        async for item in self.collection.find():
            item.pop("_id", None)
            items.append(item)
        return items

    async def get_by_id(self, item_id: str):
        item = await self.collection.find_one({"id": item_id})
        if item:
            item.pop("_id", None)
        return item