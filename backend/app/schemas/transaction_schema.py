from datetime import datetime
from pydantic import BaseModel, Field, field_validator


VALID_TRANSACTION_TYPES = {
    "sale",
    "purchase",
    "expense",
    "transfer",
    "deposit",
}

VALID_CATEGORIES = {
    "sales",
    "supplier_payment",
    "expense",
    "agency_banking",
    "cash_deposit",
}

VALID_PAYMENT_METHODS = {
    "cash",
    "qr_payment",
    "bank_transfer",
    "mobile_payment",
}

VALID_STATUSES = {
    "completed",
    "pending",
    "failed",
}


class TransactionBase(BaseModel):
    transaction_type: str
    category: str = "sales"
    amount: float = Field(..., gt=0)
    payment_method: str = "cash"
    description: str = Field(default="Transaction", min_length=1)
    date: datetime | None = None
    status: str = "completed"
    notes: str = ""

    @field_validator(
        "transaction_type",
        "category",
        "payment_method",
        "status",
        mode="before",
    )
    @classmethod
    def normalize_text(cls, value):
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("transaction_type")
    @classmethod
    def validate_transaction_type(cls, value):
        if value not in VALID_TRANSACTION_TYPES:
            raise ValueError("Invalid transaction type")
        return value

    @field_validator("category")
    @classmethod
    def validate_category(cls, value):
        if value not in VALID_CATEGORIES:
            raise ValueError("Invalid transaction category")
        return value

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, value):
        if value not in VALID_PAYMENT_METHODS:
            raise ValueError("Invalid payment method")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value):
        if value not in VALID_STATUSES:
            raise ValueError("Invalid transaction status")
        return value


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(TransactionBase):
    pass


class TransactionResponse(TransactionBase):
    id: str
    created_at: datetime
    updated_at: datetime


class TransactionDeleteResponse(BaseModel):
    message: str