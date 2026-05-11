import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

VALID_TRANSACTION_TYPES = {"cash_deposit","cash_withdrawal","fund_transfer","balance_inquiry"}
VALID_STATUS = {"pending","completed","failed","cancelled"}

class AgencyBankingCreate(BaseModel):
    customer_name:      str   = Field(..., min_length=1)
    customer_phone:     str   = Field(..., min_length=1)
    customer_nic:       Optional[str]   = None
    transaction_type:   str   = Field(..., min_length=1)
    amount:             float = Field(..., ge=0)
    account_number:     Optional[str]   = None
    bank_name:          Optional[str]   = None
    agent_cash_balance: float = Field(default=0, ge=0)
    status:             str   = "completed"
    notes:              Optional[str]   = None

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v):
        clean = v.replace(" ", "").replace("-", "")
        if not (7 <= len(clean) <= 15 and clean.lstrip("+").isdigit()):
            raise ValueError("Invalid phone number")
        return v

    @field_validator("transaction_type")
    @classmethod
    def validate_type(cls, v):
        if v not in VALID_TRANSACTION_TYPES:
            raise ValueError("Invalid transaction type")
        return v

class AgencyBankingUpdate(BaseModel):
    customer_name:      Optional[str]   = None
    customer_phone:     Optional[str]   = None
    customer_nic:       Optional[str]   = None
    transaction_type:   Optional[str]   = None
    amount:             Optional[float] = Field(default=None, ge=0)
    account_number:     Optional[str]   = None
    bank_name:          Optional[str]   = None
    agent_cash_balance: Optional[float] = Field(default=None, ge=0)
    status:             Optional[str]   = None
    notes:              Optional[str]   = None

class AgencyBankingResponse(BaseModel):
    id:                 str
    customer_name:      str
    customer_phone:     str
    customer_nic:       Optional[str]   = None
    transaction_type:   str
    amount:             float
    account_number:     Optional[str]   = None
    bank_name:          Optional[str]   = None
    service_fee:        float = 0
    commission:         float = 0
    agent_cash_balance: float = 0
    reference_number:   str
    status:             str
    notes:              Optional[str]   = None
    created_at:         datetime
    updated_at:         datetime

class AgencyBankingDeleteResponse(BaseModel):
    message: str

class AgencyBankingSummaryResponse(BaseModel):
    total_transactions:     int
    total_amount:           float
    total_service_fees:     float
    total_commission:       float
    completed_transactions: int
    failed_transactions:    int