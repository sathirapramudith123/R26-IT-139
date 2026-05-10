import re
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

VALID_TRANSACTION_TYPES = {"cash_deposit","cash_withdrawal","fund_transfer","balance_inquiry"}
VALID_STATUS = {"pending","completed","failed","cancelled"}
SRI_LANKAN_MOBILE_PATTERN = r"^(07[01245678][0-9]{7}|\+947[01245678][0-9]{7})$"

class AgencyBankingCreate(BaseModel):
    customer_name: str = Field(..., min_length=1)
    customer_phone: str = Field(..., min_length=1)
    transaction_type: str = Field(..., min_length=1)
    amount: float = Field(..., ge=0)
    agent_cash_balance: float = Field(default=0, ge=0)
    status: str = "completed"

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v):
        if not re.match(SRI_LANKAN_MOBILE_PATTERN, v):
            raise ValueError("Invalid Sri Lankan mobile number")
        return v

    @field_validator("transaction_type")
    @classmethod
    def validate_type(cls, v):
        if v not in VALID_TRANSACTION_TYPES:
            raise ValueError("Invalid transaction type")
        return v

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
