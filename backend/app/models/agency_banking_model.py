from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.utils.helpers import generate_id, utc_now


class AgencyBankingTransaction(BaseModel):
    id:                 str      = Field(default_factory=lambda: generate_id("agt"))
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
    status:             str      = "completed"
    notes:              Optional[str]   = None
    created_at:         datetime = Field(default_factory=utc_now)
    updated_at:         datetime = Field(default_factory=utc_now)