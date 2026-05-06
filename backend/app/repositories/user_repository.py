from app.core.database import MongoDB

class UserRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["users"]

    async def create(self, payload: dict):
        await self.collection.insert_one(payload)
        return payload

    async def find_by_email(self, email: str):
        return await self.collection.find_one({"email": email})

    async def list_all(self):
        items = []
        async for item in self.collection.find():
            item["_id"] = str(item.get("_id"))
            items.append(item)
        return items
