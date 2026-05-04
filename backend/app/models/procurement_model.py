from datetime import datetime
from pydantic import BaseModel, Field
from app.utils.helpers import generate_id, utc_now


class ProcurementDecision(BaseModel):
    
    id: str = Field(default_factory=lambda: generate_id("pro"))

    item_name: str
    quantity: float
    delivery_location: str
    required_delivery_date: datetime
    expected_selling_price: float

    selected_supplier_id: str | None = None
    selected_supplier_name: str | None = None

    unit_price: float = 0
    delivery_cost: float = 0
    total_cost: float = 0
    estimated_profit: float = 0
    final_score: float = 0

    decision_type: str = "rule_based"
    status: str = "pending"

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)