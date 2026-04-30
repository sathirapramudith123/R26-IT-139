from pydantic import BaseModel

class LedgerEntryCreate(BaseModel):
    title: str
    amount: float
    entry_type: str
    status: str

class LedgerSummaryResponse(BaseModel):
    total_income: float
    total_expense: float
    profit: float