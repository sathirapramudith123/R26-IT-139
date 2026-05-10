from app.core.database import MongoDB
from typing import Optional


class PriceDataRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["price_data"]

    async def upsert(self, record: dict) -> dict:
        await self.collection.update_one(
            {
                "date":       record["date"],
                "item_lower": record["item_lower"],
                "market":     record["market"],
            },
            {"$set": record},
            upsert=True,
        )
        return record

    async def get_avg_price(self, item_name: str, date: str) -> Optional[float]:
        pipeline = [
            {"$match": {
                "date":       date,
                "item_lower": item_name.lower().strip(),
            }},
            {"$group": {"_id": None, "avg_price": {"$avg": "$avg_price"}}},
        ]
        result = await self.collection.aggregate(pipeline).to_list(1)
        if result:
            return round(result[0]["avg_price"], 2)
        return None

    async def get_avg_price_latest(self, item_name: str) -> Optional[float]:
        latest_doc = await self.collection.find_one(
            {"item_lower": item_name.lower().strip()},
            sort=[("date", -1)],
        )
        if not latest_doc:
            latest_doc = await self.collection.find_one(
                {"item_lower": {"$regex": item_name.lower().strip()[:5]}},
                sort=[("date", -1)],
            )
        if not latest_doc:
            return None
        return await self.get_avg_price(item_name, latest_doc["date"])

    async def list_latest(self) -> list[dict]:
        latest = await self.collection.find_one({}, sort=[("date", -1)])
        if not latest:
            return []
        cursor = self.collection.find(
            {"date": latest["date"]}, {"_id": 0}
        ).sort("item_name", 1)
        return await cursor.to_list(500)

    async def get_all_dates(self) -> list[str]:
        dates = await self.collection.distinct("date")
        return sorted(dates, reverse=True)