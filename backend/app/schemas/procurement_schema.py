from datetime import datetime
from pydantic import BaseModel, Field

class ProcurementRecommendationRequest(BaseModel):
    item_name: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0)
    delivery_location: str = Field(..., min_length=1)
    required_delivery_date: datetime
    expected_selling_price: float = Field(..., gt=0)

class ProcurementDecisionCreate(BaseModel):
    item_name: str
    quantity: float
    delivery_location: str
    required_delivery_date: datetime
    expected_selling_price: float
    selected_supplier_id: str
    selected_supplier_name: str
    unit_price: float = 0
    delivery_cost: float = 0
    total_cost: float = 0
    estimated_profit: float = 0
    final_score: float = 0
    status: str = "pending"

class ProcurementDecisionUpdate(ProcurementDecisionCreate):
    pass

class ProcurementDecisionResponse(BaseModel):
    id: str
    item_name: str = ""
    quantity: float | None = None
    delivery_location: str | None = None
    required_delivery_date: datetime | None = None
    expected_selling_price: float | None = None
    selected_supplier_id: str | None = None
    selected_supplier_name: str | None = None
    unit_price: float = 0
    delivery_cost: float = 0
    total_cost: float = 0
    estimated_profit: float = 0
    final_score: float = 0
    decision_type: str = "rule_based"
    status: str = "pending"
    created_at: datetime
    updated_at: datetime

class ProcurementDeleteResponse(BaseModel):
    message: str
