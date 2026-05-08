from datetime import datetime
from pydantic import BaseModel, Field, field_validator

VALID_TYPES = {"low_stock","procurement","ledger","agency_banking","system"}
VALID_PRIORITIES = {"low","medium","high"}
VALID_STATUS = {"active","archived"}

class NotificationCreate(BaseModel):
    title: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    type: str = "system"
    priority: str = "medium"
    source_module: str = "system"
    source_id: str | None = None
    is_read: bool = False
    status: str = "active"

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        if v not in VALID_TYPES:
            raise ValueError("Invalid notification type")
        return v

class NotificationUpdate(BaseModel):
    title: str | None = None
    message: str | None = None
    type: str | None = None
    priority: str | None = None
    source_module: str | None = None
    source_id: str | None = None
    is_read: bool | None = None
    status: str | None = None

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    priority: str
    source_module: str
    source_id: str | None = None
    is_read: bool
    status: str
    created_at: datetime
    updated_at: datetime

class NotificationDeleteResponse(BaseModel):
    message: str
