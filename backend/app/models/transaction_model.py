from pydantic import BaseModel, Field
from datetime import datetime
from app.utils.helpers import generate_id, utc_now

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("txn"))
    transaction_type: str
    amount: float
    status: str
    date: datetime
    payment_method: str
    description: str
    notes: str = ""
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)