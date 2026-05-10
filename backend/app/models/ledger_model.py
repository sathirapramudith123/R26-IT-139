from datetime import datetime
from pydantic import BaseModel, Field

from app.utils.helpers import generate_id, utc_now


class LedgerEntry(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("led"))
    title: str
    amount: float
    entry_type: str
    category: str
    payment_method: str
    source_transaction_id: str | None = None
    status: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)