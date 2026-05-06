from datetime import datetime
from pydantic import BaseModel, Field, field_validator


VALID_TYPES = {
    "low_stock",
    "procurement",
    "ledger",
    "agency_banking",
    "system",
}

VALID_PRIORITIES = {
    "low",
    "medium",
    "high",
}

VALID_STATUS = {
    "active",
    "archived",
}


class NotificationCreate(BaseModel):
    title: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)

    type: str = "system"
    priority: str = "medium"

    source_module: str = "system"
    source_id: str | None = None

    is_read: bool = False
    status: str = "active"

    @field_validator("title", "message", "type", "priority", "source_module", "status")
    @classmethod
    def strip_text(cls, value: str):
        return value.strip() if isinstance(value, str) else value

    @field_validator("type")
    @classmethod
    def validate_type(cls, value: str):
        if value not in VALID_TYPES:
            raise ValueError("Invalid notification type")
        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str):
        if value not in VALID_PRIORITIES:
            raise ValueError("Invalid priority")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str):
        if value not in VALID_STATUS:
            raise ValueError("Invalid status")
        return value


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