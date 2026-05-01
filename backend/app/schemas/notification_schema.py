from datetime import datetime
from pydantic import BaseModel


class NotificationCreate(BaseModel):
    title: str
    message: str
    status: str


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    status: str
    created_at: datetime
    updated_at: datetime