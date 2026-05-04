from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator


VALID_TRANSACTION_TYPES = {
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


def utc_now():
    return datetime.now(timezone.utc)


class TransactionCreate(BaseModel):
    transaction_type: str
    category: str
    amount: float = Field(..., gt=0)
    payment_method: str
    description: str = Field(..., min_length=1)

    # machine/system date & time
    date: datetime = Field(default_factory=utc_now)

    status: str = "completed"
    notes: str = ""

    @field_validator("transaction_type")
    @classmethod
    def validate_transaction_type(cls, value):
        if value not in VALID_TRANSACTION_TYPES:
            raise ValueError("Invalid transaction type")
        return value

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, value):
        if value not in VALID_PAYMENT_METHODS:
            raise ValueError("Invalid payment method")
        return value


class TransactionResponse(TransactionCreate):
    id: str
    created_at: datetime
    updated_at: datetime