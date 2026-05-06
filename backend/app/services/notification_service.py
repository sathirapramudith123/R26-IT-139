from fastapi import HTTPException, status

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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )

        return item

    async def update(self, item_id: str, data: dict):
        existing = await self.repository.get_by_id(item_id)

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )

        clean_data = {
            key: value
            for key, value in data.items()
            if value is not None
        }

        updated_payload = {
            **existing,
            **clean_data,
        }

        return await self.repository.update(item_id, updated_payload)

    async def mark_as_read(self, item_id: str):
        existing = await self.repository.get_by_id(item_id)

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )

        existing["is_read"] = True
        return await self.repository.update(item_id, existing)

    async def delete(self, item_id: str):
        existing = await self.repository.get_by_id(item_id)

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )

        deleted = await self.repository.delete(item_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete notification",
            )

        return {"message": "Notification deleted successfully"}