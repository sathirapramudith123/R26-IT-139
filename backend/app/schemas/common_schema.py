from datetime import datetime
from pydantic import BaseModel, Field

class MessageResponse(BaseModel):
    message: str

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str

class TimestampedSchema(BaseModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
