from app.core.database import MongoDB
from app.utils.helpers import utc_now


class UserRepository:
    @property
    def collection(self):
        return MongoDB.get_database()["users"]

    async def create(self, payload: dict) -> dict:
        await self.collection.insert_one(payload)
        return payload

    async def find_by_email(self, email: str) -> dict | None:
        return await self.collection.find_one({"email": email})

    async def find_by_id(self, user_id: str) -> dict | None:
        """Find user by their application-level id field (not MongoDB _id)."""
        user = await self.collection.find_one({"id": user_id})
        if user:
            user.pop("_id", None)
        return user

    async def update_role(self, user_id: str, new_role: str) -> dict | None:
        """Update a user's role — used by admin for onboarding approval."""
        await self.collection.update_one(
            {"id": user_id},
            {"$set": {"role": new_role, "updated_at": utc_now()}},
        )
        return await self.find_by_id(user_id)

    async def list_all(self) -> list[dict]:
        items = []
        async for item in self.collection.find():
            item.pop("_id", None)
            item.pop("password_hash", None)   # never expose password hash
            items.append(item)
        return items
