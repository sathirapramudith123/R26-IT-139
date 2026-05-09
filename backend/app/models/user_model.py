from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.utils.helpers import generate_id, utc_now


class User(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("usr"))
    full_name: str
    email: EmailStr
    password_hash: str
    role: str = "merchant | bank_agent | admin"   # merchant | bank_agent | admin
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
