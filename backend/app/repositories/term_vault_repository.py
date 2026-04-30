from app.core.database import MongoDB


class TermVaultRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["term_vaults"]

    async def create(self, payload: dict):
        await self.collection.insert_one(payload)
        return payload

    async def list_all(self):
        items = []
        async for item in self.collection.find():
            item["_id"] = str(item.get("_id"))
            items.append(item)
        return items

    async def get_by_id(self, item_id: str):
        return await self.collection.find_one({"id": item_id})