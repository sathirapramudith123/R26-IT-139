from datetime import datetime
from app.core.database import MongoDB
from app.utils.helpers import utc_now


def serialize_sync(item: dict) -> dict | None:
    if not item:
        return None
    item.pop("_id", None)
    return item


class SyncRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["pending_sync_queue"]

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create(self, payload: dict) -> dict:
        await self.collection.insert_one(payload)
        return serialize_sync(payload)

    async def create_many(self, items: list[dict]) -> list[dict]:
        """Bulk insert — used when frontend submits a batch of offline ops."""
        if not items:
            return []
        await self.collection.insert_many(items)
        return [serialize_sync(i) for i in items]

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_by_id(self, sync_id: str) -> dict | None:
        item = await self.collection.find_one({"id": sync_id})
        return serialize_sync(item)

    async def list_pending(self, user_id: str) -> list[dict]:
        """All pending items for a user, ordered oldest-first for replay."""
        items = []
        cursor = (
            self.collection
            .find({"user_id": user_id, "status": "pending"})
            .sort("client_timestamp", 1)
        )
        async for item in cursor:
            items.append(serialize_sync(item))
        return items

    async def list_all_for_user(self, user_id: str) -> list[dict]:
        items = []
        cursor = (
            self.collection
            .find({"user_id": user_id})
            .sort("client_timestamp", -1)
        )
        async for item in cursor:
            items.append(serialize_sync(item))
        return items

    async def list_conflicts(self, user_id: str) -> list[dict]:
        items = []
        cursor = self.collection.find({"user_id": user_id, "status": "conflict"})
        async for item in cursor:
            items.append(serialize_sync(item))
        return items

    async def get_status_summary(self, user_id: str) -> dict:
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        result = await self.collection.aggregate(pipeline).to_list(20)
        summary = {
            "pending": 0,
            "synced":  0,
            "conflict": 0,
            "failed":  0,
            "skipped": 0,
        }
        for r in result:
            summary[r["_id"]] = r["count"]
        summary["total"] = sum(summary.values())
        return summary

    # ── Status transitions ────────────────────────────────────────────────────

    async def mark_synced(self, sync_id: str, server_record_id: str) -> dict | None:
        await self.collection.update_one(
            {"id": sync_id},
            {"$set": {
                "status":           "synced",
                "server_record_id": server_record_id,
                "synced_at":        utc_now(),
                "error_message":    None,
            }},
        )
        return await self.get_by_id(sync_id)

    async def mark_conflict(self, sync_id: str, reason: str) -> dict | None:
        await self.collection.update_one(
            {"id": sync_id},
            {"$set": {
                "status":        "conflict",
                "error_message": reason,
                "synced_at":     utc_now(),
            }},
        )
        return await self.get_by_id(sync_id)

    async def mark_failed(self, sync_id: str, error: str) -> dict | None:
        await self.collection.update_one(
            {"id": sync_id},
            {
                "$set": {"status": "failed", "error_message": error},
                "$inc": {"retry_count": 1},
            },
        )
        return await self.get_by_id(sync_id)

    async def mark_skipped(self, sync_id: str, reason: str) -> dict | None:
        await self.collection.update_one(
            {"id": sync_id},
            {"$set": {
                "status":        "skipped",
                "error_message": reason,
                "synced_at":     utc_now(),
            }},
        )
        return await self.get_by_id(sync_id)

    async def reset_to_pending(self, sync_id: str) -> dict | None:
        """Allow merchant to re-queue a failed or conflict item."""
        await self.collection.update_one(
            {"id": sync_id},
            {"$set": {
                "status":        "pending",
                "error_message": None,
                "synced_at":     None,
            }},
        )
        return await self.get_by_id(sync_id)

    async def delete(self, sync_id: str) -> bool:
        result = await self.collection.delete_one({"id": sync_id})
        return result.deleted_count > 0

    async def clear_synced(self, user_id: str) -> int:
        """Remove all synced records for a user to keep the queue clean."""
        result = await self.collection.delete_many(
            {"user_id": user_id, "status": "synced"}
        )
        return result.deleted_count
