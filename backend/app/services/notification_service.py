from fastapi import HTTPException

from app.models.notification_model import Notification
from app.repositories.notification_repository import NotificationRepository


class NotificationService:
    def __init__(self):
        self.repository = NotificationRepository()

    async def create(self, data: dict):
        payload = Notification(**data).model_dump()
        return await self.repository.create(payload)

    async def list_all(self):
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Notification not found")
        return item