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


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(InventoryItemBase):
    pass


class InventoryItemResponse(BaseModel):
    id: str
    name: str
    supplier_id: str
    supplier_name: str

    quantity: float
    reorder_level: float

    unit: str
    unit_price: float
    status: str

    created_at: datetime
    updated_at: datetime


class InventoryDeleteResponse(BaseModel):
    message: str