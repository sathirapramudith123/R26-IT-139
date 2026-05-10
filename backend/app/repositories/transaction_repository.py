from datetime import datetime
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


def _s(doc: dict | None) -> dict | None:
    """
    Serialize a MongoDB document:
    - Convert ObjectId _id → string id
    - Remove _id from the dict
    - Convert any remaining ObjectId values to strings
    """
    if not doc:
        return None
    d = dict(doc)
    # Set id from _id if not already present
    if "_id" in d:
        if "id" not in d or not d["id"]:
            d["id"] = str(d["_id"])
        del d["_id"]
    # Convert any other ObjectId values
    for k, v in d.items():
        if isinstance(v, ObjectId):
            d[k] = str(v)
    return d


def _sl(docs: list) -> list[dict]:
    """Serialize a list of MongoDB documents."""
    return [_s(d) for d in docs if d is not None]


class TransactionRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["transactions"]

    # ── Create ────────────────────────────────────────────────────────────────

    async def create(self, transaction: dict) -> dict:
        transaction["created_at"] = datetime.utcnow()
        transaction["updated_at"] = datetime.utcnow()
        result = await self.collection.insert_one(transaction)
        created = await self.collection.find_one({"_id": result.inserted_id})
        return _s(created)

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_id(self, transaction_id: str, user_id: str = None) -> Optional[dict]:
        """Find by custom id field first, then try ObjectId _id."""
        # Try custom string id first
        doc = await self.collection.find_one({"id": transaction_id})
        if not doc and user_id:
            doc = await self.collection.find_one({"id": transaction_id, "user_id": user_id})
        # Fallback: try ObjectId
        if not doc:
            try:
                doc = await self.collection.find_one({"_id": ObjectId(transaction_id)})
            except Exception:
                pass
        return _s(doc)

    async def get_all(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50,
        transaction_type: Optional[str] = None,
        payment_method: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> list[dict]:
        query: dict = {"user_id": user_id}
        if transaction_type:
            query["transaction_type"] = transaction_type
        if payment_method:
            query["payment_method"] = payment_method
        if start_date or end_date:
            query["date"] = {}
            if start_date:
                query["date"]["$gte"] = start_date
            if end_date:
                query["date"]["$lte"] = end_date

        cursor = self.collection.find(query).sort("date", -1).skip(skip).limit(limit)
        return _sl(await cursor.to_list(length=limit))

    async def list_all(self, limit: int = 200) -> list[dict]:
        cursor = self.collection.find().sort("created_at", -1).limit(limit)
        return _sl(await cursor.to_list(length=limit))

    async def count(self, user_id: str) -> int:
        return await self.collection.count_documents({"user_id": user_id})

    # ── Update ────────────────────────────────────────────────────────────────

    async def update(self, transaction_id: str, user_id: str = None, data: dict = None) -> Optional[dict]:
        if data is None:
            data = {}
        data["updated_at"] = datetime.utcnow()
        data.pop("_id", None)  # never update _id

        # Try by custom id field first
        result = await self.collection.update_one(
            {"id": transaction_id},
            {"$set": data},
        )
        if result.matched_count == 0 and user_id:
            # Fallback: try ObjectId
            try:
                await self.collection.update_one(
                    {"_id": ObjectId(transaction_id)},
                    {"$set": data},
                )
            except Exception:
                pass
        return await self.get_by_id(transaction_id, user_id)

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete(self, transaction_id: str, user_id: str = None) -> bool:
        # Try by custom id field first
        result = await self.collection.delete_one({"id": transaction_id})
        if result.deleted_count > 0:
            return True
        # Fallback: try ObjectId
        try:
            result = await self.collection.delete_one({"_id": ObjectId(transaction_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    # ── Aggregations ──────────────────────────────────────────────────────────

    async def get_summary(self, user_id: str) -> dict:
        pipeline = [
            {"$match": {"user_id": user_id, "status": "completed"}},
            {"$group": {
                "_id": None,
                "total_income": {
                    "$sum": {"$cond": [{"$eq": ["$transaction_type", "sale"]}, "$amount", 0]}
                },
                "total_expenses": {
                    "$sum": {
                        "$cond": [
                            {"$in": ["$transaction_type", ["expense", "purchase"]]},
                            "$amount", 0,
                        ]
                    }
                },
                "cash_balance": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$payment_method", "cash"]},
                            {"$cond": [
                                {"$eq": ["$transaction_type", "sale"]},
                                "$amount",
                                {"$multiply": ["$amount", -1]},
                            ]},
                            0,
                        ]
                    }
                },
            }},
        ]
        result = await self.collection.aggregate(pipeline).to_list(1)
        if result:
            r = result[0]
            return {
                "total_income":   r.get("total_income", 0),
                "total_expenses": r.get("total_expenses", 0),
                "net_profit":     r.get("total_income", 0) - r.get("total_expenses", 0),
                "cash_balance":   r.get("cash_balance", 0),
                "last_updated":   datetime.utcnow(),
            }
        return {
            "total_income": 0, "total_expenses": 0, "net_profit": 0,
            "cash_balance": 0, "last_updated": datetime.utcnow(),
        }

    async def get_monthly_report(self, user_id: str) -> list[dict]:
        pipeline = [
            {"$match": {"user_id": user_id, "status": "completed"}},
            {"$group": {
                "_id": {"year": {"$year": "$date"}, "month": {"$month": "$date"}},
                "total_income":      {"$sum": {"$cond": [{"$eq": ["$transaction_type", "sale"]}, "$amount", 0]}},
                "total_expenses":    {"$sum": {"$cond": [{"$in": ["$transaction_type", ["expense","purchase"]]}, "$amount", 0]}},
                "transaction_count": {"$sum": 1},
            }},
            {"$sort": {"_id.year": -1, "_id.month": -1}},
            {"$limit": 12},
        ]
        results = await self.collection.aggregate(pipeline).to_list(12)
        months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        return [
            {
                "month":             months[r["_id"]["month"] - 1],
                "year":              r["_id"]["year"],
                "total_income":      r["total_income"],
                "total_expenses":    r["total_expenses"],
                "net_profit":        r["total_income"] - r["total_expenses"],
                "transaction_count": r["transaction_count"],
            }
            for r in results
        ]

    async def get_category_report(self, user_id: str) -> list[dict]:
        pipeline = [
            {"$match": {"user_id": user_id, "status": "completed", "category": {"$ne": None}}},
            {"$group": {
                "_id": "$category",
                "total_amount":      {"$sum": "$amount"},
                "transaction_count": {"$sum": 1},
            }},
            {"$sort": {"total_amount": -1}},
        ]
        results = await self.collection.aggregate(pipeline).to_list(20)
        return [
            {"category": r["_id"], "total_amount": r["total_amount"],
             "transaction_count": r["transaction_count"]}
            for r in results
        ]

    async def get_payment_method_report(self, user_id: str) -> list[dict]:
        pipeline = [
            {"$match": {"user_id": user_id, "status": "completed"}},
            {"$group": {
                "_id": "$payment_method",
                "total_amount":      {"$sum": "$amount"},
                "transaction_count": {"$sum": 1},
            }},
            {"$sort": {"total_amount": -1}},
        ]
        results = await self.collection.aggregate(pipeline).to_list(10)
        return [
            {"payment_method": r["_id"], "total_amount": r["total_amount"],
             "transaction_count": r["transaction_count"]}
            for r in results
        ]
