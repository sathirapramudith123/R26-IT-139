from datetime import datetime
from pydantic import BaseModel, Field

from app.utils.helpers import generate_id, utc_now


class InventoryItem(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("inv"))

    name: str
    supplier_id: str
    supplier_name: str = "Unknown Supplier"

    quantity: float
    reorder_level: float

    unit: str
    unit_price: float
    status: str = "active"

    sync_status: str = "synced"
    version: int = 1
    device_id: str | None = None
    last_synced_at: datetime | None = None

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)