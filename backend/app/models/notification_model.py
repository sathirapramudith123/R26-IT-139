from datetime import datetime
from pydantic import BaseModel, Field

from app.utils.helpers import generate_id, utc_now


class Notification(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("not"))

    title: str
    message: str

    type: str = "system"
    priority: str = "medium"

    source_module: str = "system"
    source_id: str | None = None

    is_read: bool = False
    status: str = "active"

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)