from datetime import datetime
from pydantic import BaseModel, Field
from app.utils.helpers import generate_id, utc_now


class Procurement(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("pro"))
    item_id: str
    item_name: str
    current_quantity: float
    reorder_level: float
    recommended_quantity: float
    recommended_supplier_id: str | None = None
    recommended_supplier_name: str | None = None
    supplier_score: float = 0
    decision_reason: str
    decision_type: str = "auto"
    status: str = "pending"
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)