from pydantic import BaseModel, Field
from datetime import datetime
from app.utils.helpers import generate_id, utc_now

class LedgerEntry(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("led"))
    title: str
    amount: float
    entry_type: str   # income / expense
    status: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)