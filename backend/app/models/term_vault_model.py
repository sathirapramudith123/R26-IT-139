from pydantic import BaseModel, Field
from datetime import datetime
from app.utils.helpers import generate_id, utc_now

class TermVault(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("tv"))
    name: str
    member_count: int
    status: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
