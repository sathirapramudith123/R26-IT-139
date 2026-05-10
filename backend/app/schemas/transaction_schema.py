from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.transaction_model import TransactionType, PaymentMethod, TransactionStatus, ExpenseCategory

class TransactionCreate(BaseModel):
    transaction_type: TransactionType
    payment_method:   PaymentMethod
    amount:           float = Field(gt=0)
    description:      Optional[str] = Field(None, max_length=300)
    category:         Optional[ExpenseCategory] = None
    date:             Optional[datetime] = None
    item_name:        Optional[str] = None
    quantity:         Optional[float] = None
    model_config = {"use_enum_values": True}

class TransactionUpdate(BaseModel):
    payment_method: Optional[PaymentMethod] = None
    amount:         Optional[float] = Field(None, gt=0)
    description:    Optional[str]   = Field(None, max_length=300)
    category:       Optional[ExpenseCategory] = None
    status:         Optional[TransactionStatus] = None
    date:           Optional[datetime] = None
    item_name:      Optional[str] = None
    quantity:       Optional[float] = None
    model_config = {"use_enum_values": True}

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    transaction_type: str
    payment_method: str
    amount: float
    description: Optional[str] = None
    category: Optional[str] = None
    reference_number: Optional[str] = None
    status: str
    date: datetime
    created_at: datetime
    updated_at: datetime

class LedgerSummaryResponse(BaseModel):
    total_income: float
    total_expenses: float
    net_profit: float
    cash_balance: float
    bank_balance: float
    last_updated: datetime

class MonthlyReportItem(BaseModel):
    month: str
    year: int
    total_income: float
    total_expenses: float
    net_profit: float
    transaction_count: int

class CategoryReportItem(BaseModel):
    category: str
    total_amount: float
    transaction_count: int

class PaymentMethodReportItem(BaseModel):
    payment_method: str
    total_amount: float
    transaction_count: int

class ReportsResponse(BaseModel):
    monthly: list[MonthlyReportItem]
    by_category: list[CategoryReportItem]
    by_payment_method: list[PaymentMethodReportItem]