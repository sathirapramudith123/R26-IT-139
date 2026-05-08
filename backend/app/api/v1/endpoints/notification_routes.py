from fastapi import APIRouter, status
from app.schemas.notification_schema import NotificationCreate, NotificationUpdate, NotificationResponse, NotificationDeleteResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=list[NotificationResponse])
async def list_items():
    return await NotificationService().list_all()

@router.get("/{item_id}", response_model=NotificationResponse)
async def get_item(item_id: str):
    return await NotificationService().get_by_id(item_id)

@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_item(payload: NotificationCreate):
    return await NotificationService().create(payload.model_dump())

@router.put("/{item_id}", response_model=NotificationResponse)
async def update_item(item_id: str, payload: NotificationUpdate):
    return await NotificationService().update(item_id, payload.model_dump())

@router.put("/{item_id}/read", response_model=NotificationResponse)
async def mark_as_read(item_id: str):
    return await NotificationService().mark_as_read(item_id)

@router.delete("/{item_id}", response_model=NotificationDeleteResponse)
async def delete_item(item_id: str):
    return await NotificationService().delete(item_id)
