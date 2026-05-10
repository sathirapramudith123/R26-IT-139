from datetime import datetime
from pydantic import BaseModel, Field

class LedgerEntryCreate(BaseModel):
    title: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    entry_type: str
    category: str
    payment_method: str
    source_transaction_id: str | None = None
    status: str = "completed"

class LedgerEntryUpdate(BaseModel):
    title: str | None = None
    amount: float | None = None
    entry_type: str | None = None
    category: str | None = None
    payment_method: str | None = None
    source_transaction_id: str | None = None
    status: str | None = None

class LedgerEntryResponse(LedgerEntryCreate):
    id: str
    created_at: datetime
    updated_at: datetime

class LedgerSummaryResponse(BaseModel):
    total_income: float
    total_expense: float
    net_profit: float
    cash_balance: float
    transaction_count: int
