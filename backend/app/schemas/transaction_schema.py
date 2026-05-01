from pydantic import BaseModel
from datetime import datetime

class TransactionCreate(BaseModel):
    transaction_type: str
    amount: float
    status: str
    date: datetime
    payment_method: str
    description: str
    notes: str = ""

class TransactionResponse(TransactionCreate):
    id: str