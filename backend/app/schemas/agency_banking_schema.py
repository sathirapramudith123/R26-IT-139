from datetime import datetime
import re

from pydantic import BaseModel, Field, field_validator


VALID_TRANSACTION_TYPES = {
    "cash_deposit",
    "cash_withdrawal",
    "fund_transfer",
    "balance_inquiry",
}

VALID_STATUS = {
    "pending",
    "completed",
    "failed",
    "cancelled",
}

SRI_LANKAN_MOBILE_PATTERN = r"^(07[01245678][0-9]{7}|\+947[01245678][0-9]{7})$"


class AgencyBankingCreate(BaseModel):
    customer_name: str = Field(..., min_length=1)
    customer_phone: str = Field(..., min_length=1)
    transaction_type: str = Field(..., min_length=1)
    amount: float = Field(..., ge=0)
    agent_cash_balance: float = Field(default=0, ge=0)
    status: str = "completed"

    @field_validator("customer_name", "customer_phone", "transaction_type", "status")
    @classmethod
    def strip_text(cls, value: str):
        return value.strip() if isinstance(value, str) else value

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, value: str):
        if not re.match(SRI_LANKAN_MOBILE_PATTERN, value):
            raise ValueError("Invalid Sri Lankan mobile number. Use 0771234567 or +94771234567")
        return value

    @field_validator("transaction_type")
    @classmethod
    def validate_transaction_type(cls, value: str):
        if value not in VALID_TRANSACTION_TYPES:
            raise ValueError("Invalid agency banking transaction type")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str):
        if value not in VALID_STATUS:
            raise ValueError("Invalid status")
        return value


class AgencyBankingUpdate(BaseModel):
    customer_name: str | None = None
    customer_phone: str | None = None
    transaction_type: str | None = None
    amount: float | None = Field(default=None, ge=0)
    agent_cash_balance: float | None = Field(default=None, ge=0)
    status: str | None = None


class AgencyBankingResponse(BaseModel):
    id: str
    customer_name: str
    customer_phone: str
    transaction_type: str
    amount: float
    service_fee: float = 0
    commission: float = 0
    agent_cash_balance: float = 0
    reference_number: str
    status: str
    created_at: datetime
    updated_at: datetime


class AgencyBankingDeleteResponse(BaseModel):
    message: str


class AgencyBankingSummaryResponse(BaseModel):
    total_transactions: int
    total_amount: float
    total_service_fees: float
    total_commission: float
    completed_transactions: int
    failed_transactions: int