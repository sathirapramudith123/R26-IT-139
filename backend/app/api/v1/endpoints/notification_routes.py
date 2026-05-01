from fastapi import APIRouter

from app.schemas.notification_schema import NotificationCreate, NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_items():
    service = NotificationService()
    return await service.list_all()


@router.get("/{item_id}", response_model=NotificationResponse)
async def get_item(item_id: str):
    service = NotificationService()
    return await service.get_by_id(item_id)


@router.post("", response_model=NotificationResponse)
async def create_item(payload: NotificationCreate):
    service = NotificationService()
    return await service.create(payload.model_dump())