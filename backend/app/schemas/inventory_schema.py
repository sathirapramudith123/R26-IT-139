from datetime import datetime
from pydantic import BaseModel, Field


class InventoryItemBase(BaseModel):
    name: str = Field(..., min_length=1)
    supplier_id: str = Field(..., min_length=1)
    supplier_name: str = "Unknown Supplier"

    quantity: float = Field(..., ge=0)
    reorder_level: float = Field(..., ge=0)

    unit: str = Field(..., min_length=1)
    unit_price: float = Field(..., ge=0)

    status: str = "active"

    sync_status: str = "synced"
    version: int = 1
    device_id: str | None = None
    last_synced_at: datetime | None = None


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(InventoryItemBase):
    pass


class InventoryItemResponse(BaseModel):
    id: str
    name: str
    supplier_id: str = ""
    supplier_name: str = "Unknown Supplier"

    quantity: float
    reorder_level: float

    unit: str = "unit"
    unit_price: float
    status: str

    sync_status: str = "synced"
    version: int = 1
    device_id: str | None = None
    last_synced_at: datetime | None = None

    created_at: datetime
    updated_at: datetime


class InventoryDeleteResponse(BaseModel):
    message: str