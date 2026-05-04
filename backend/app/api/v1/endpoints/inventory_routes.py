from fastapi import APIRouter, status

from app.schemas.inventory_schema import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryItemResponse,
    InventoryDeleteResponse,
)
from app.services.inventory_service import InventoryItemService

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryItemResponse])
async def list_items():
    service = InventoryItemService()
    return await service.list_all()


@router.get("/{item_id}", response_model=InventoryItemResponse)
async def get_item(item_id: str):
    service = InventoryItemService()
    return await service.get_by_id(item_id)


@router.post("", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(payload: InventoryItemCreate):
    service = InventoryItemService()
    return await service.create(payload.model_dump())


@router.put("/{item_id}", response_model=InventoryItemResponse)
async def update_item(item_id: str, payload: InventoryItemUpdate):
    service = InventoryItemService()
    return await service.update(item_id, payload.model_dump())


@router.delete("/{item_id}", response_model=InventoryDeleteResponse)
async def delete_item(item_id: str):
    service = InventoryItemService()
    return await service.delete(item_id)