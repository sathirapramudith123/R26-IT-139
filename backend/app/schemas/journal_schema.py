from datetime import datetime
from pydantic import BaseModel

class JournalLineResponse(BaseModel):
    account_code: str
    account_name: str
    entry_type: str
    amount: float

class JournalEntryResponse(BaseModel):
    id: str
    transaction_id: str
    description: str
    lines: list[JournalLineResponse]
    created_at: datetime

class TrialBalanceRow(BaseModel):
    account_code: str
    account_name: str
    account_type: str
    debit_total: float
    credit_total: float
    balance: float

class TrialBalanceResponse(BaseModel):
    rows: list[TrialBalanceRow]
    total_debits: float
    total_credits: float
    balanced: bool
