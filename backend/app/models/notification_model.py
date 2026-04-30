from datetime import datetime
from pydantic import BaseModel, Field

from app.utils.helpers import generate_id, utc_now


class Notification(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("not"))
    title: str
    message: str
    status: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)