from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field
from bson import ObjectId


class TransactionType(str, Enum):
    SALE     = "sale"
    PURCHASE = "purchase"
    EXPENSE  = "expense"
    DEPOSIT  = "deposit"
    TRANSFER = "transfer"


class PaymentMethod(str, Enum):
    CASH    = "cash"
    BANK    = "bank"
    DIGITAL = "digital"


class TransactionStatus(str, Enum):
    PENDING   = "pending"
    COMPLETED = "completed"
    FAILED    = "failed"


class ExpenseCategory(str, Enum):
    UTILITIES        = "utilities"
    RENT             = "rent"
    SUPPLIER_PAYMENT = "supplier_payment"
    GENERAL          = "general"
    BANKING          = "banking"
    OTHER            = "other"


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, _info=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, schema, handler):
        schema.update(type="string")
        return schema


class TransactionModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    transaction_type: TransactionType
    payment_method: PaymentMethod
    amount: float = Field(gt=0)
    description: str
    category: Optional[ExpenseCategory] = None
    reference_number: Optional[str] = None
    status: TransactionStatus = TransactionStatus.COMPLETED
    date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
    }
