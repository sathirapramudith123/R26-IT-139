from datetime import datetime
from pydantic import BaseModel, Field
from app.utils.helpers import generate_id, utc_now


class AgencyBankingTransaction(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("agt"))
    customer_name: str
    customer_phone: str
    transaction_type: str
    amount: float
    service_fee: float = 0
    commission: float = 0
    agent_cash_balance: float = 0
    reference_number: str
    status: str = "completed"
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
