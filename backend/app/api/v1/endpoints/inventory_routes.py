from fastapi import APIRouter, Depends, status

from app.schemas.inventory_schema import (
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryItemResponse,
    InventoryDeleteResponse,
)
from app.services.inventory_service import InventoryItemService
from app.api.deps import get_current_user

router = APIRouter(prefix="/inventory", tags=["inventory"])


# ── ML route MUST come before /{item_id} wildcard ─────────────────────────────

@router.get("/ml/demand")
async def get_inventory_demand(
    current_user: dict = Depends(get_current_user),
):
    """ML demand forecasting and reorder recommendations for all inventory items."""
    from app.services.inventory_ml_service import InventoryMLService
    return await InventoryMLService().run_inventory_analytics()


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[InventoryItemResponse])
async def list_items():
    return await InventoryItemService().list_all()


@router.post("", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(payload: InventoryItemCreate):
    return await InventoryItemService().create(payload.model_dump())


@router.put("/{item_id}", response_model=InventoryItemResponse)
async def update_item(item_id: str, payload: InventoryItemUpdate):
    return await InventoryItemService().update(item_id, payload.model_dump())


@router.delete("/{item_id}", response_model=InventoryDeleteResponse)
async def delete_item(item_id: str):
    return await InventoryItemService().delete(item_id)


# ── /{item_id} MUST be last — matches anything ────────────────────────────────

@router.get("/{item_id}", response_model=InventoryItemResponse)
async def get_item(item_id: str):
    return await InventoryItemService().get_by_id(item_id)