from app.core.database import MongoDB

class LedgerEntryRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["ledger_entries"]

    async def create(self, payload: dict):
        await self.collection.insert_one(payload)
        return payload

    async def list_all(self):
        items = []
        async for item in self.collection.find():
            item.pop("_id", None)
            items.append(item)
        return items