from app.core.database import MongoDB
from app.utils.helpers import utc_now


def serialize_agency_transaction(item: dict) -> dict | None:
    if not item:
        return None

    item.pop("_id", None)

    item.setdefault("service_fee", 0)
    item.setdefault("commission", 0)
    item.setdefault("agent_cash_balance", 0)
    item.setdefault("reference_number", "")
    item.setdefault("status", "completed")
    item.setdefault("created_at", utc_now())
    item.setdefault("updated_at", utc_now())

    return item


class AgencyBankingRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["agency_banking_transactions"]

    async def create(self, payload: dict):
        await self.collection.insert_one(payload)
        return serialize_agency_transaction(payload)

    async def list_all(self):
        items = []
        async for item in self.collection.find().sort("created_at", -1):
            items.append(serialize_agency_transaction(item))
        return items

    async def get_by_id(self, item_id: str):
        item = await self.collection.find_one({"id": item_id})
        return serialize_agency_transaction(item)

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
    

    