from datetime import datetime
from pydantic import BaseModel, Field

from app.utils.helpers import generate_id, utc_now


class Supplier(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("sup"))

    name: str
    company_name: str = "N/A"
    contact_number: str
    email: str = "N/A"
    address: str = ""
    status: str = "active"

    price_score: float = 0
    reliability_score: float = 0
    delivery_score: float = 0
    total_score: float = 0

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)