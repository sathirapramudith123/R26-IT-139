from datetime import datetime
from pydantic import BaseModel, Field

from app.utils.helpers import generate_id, utc_now


class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("txn"))

    transaction_type: str
    category: str
    amount: float
    payment_method: str
    description: str
    date: datetime = Field(default_factory=utc_now)

    status: str = "completed"
    notes: str = ""

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)