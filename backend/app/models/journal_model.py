from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.transaction_model import PyObjectId


class AccountCode(str, Enum):
    CASH_ON_HAND      = "1001"
    BANK_DIGITAL      = "1002"
    SALES_REVENUE     = "4001"
    COST_OF_GOODS     = "5001"
    UTILITIES_EXPENSE = "6001"
    RENT_EXPENSE      = "6002"
    GENERAL_OPERATING = "6003"
    SUPPLIER_PAYMENT  = "6004"


ACCOUNT_NAMES = {
    "1001": "Cash on Hand",
    "1002": "Bank & Digital Payments",
    "4001": "Sales Revenue",
    "5001": "Cost of Goods Sold",
    "6001": "Utilities Expense",
    "6002": "Rent Expense",
    "6003": "General Operating Expense",
    "6004": "Supplier Payment",
}


class JournalEntryLine(BaseModel):
    account_code: str
    account_name: str
    entry_type: str   # "debit" | "credit"
    amount: float


class JournalEntryModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    transaction_id: str
    user_id: str
    description: str
    lines: list[JournalEntryLine]
    date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
    }
