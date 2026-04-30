from pydantic import BaseModel
from datetime import datetime


class ProcurementCreate(BaseModel):
    item_id: str
    item_name: str
    current_quantity: float
    reorder_level: float
    recommended_quantity: float
    recommended_supplier_id: str | None = None
    recommended_supplier_name: str | None = None
    supplier_score: float
    decision_reason: str
    decision_type: str
    status: str


class ProcurementResponse(ProcurementCreate):
    id: str
    created_at: datetime
    updated_at: datetime