from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field
from app.utils.helpers import generate_id, utc_now


class SyncQueueItem(BaseModel):
    id: str = Field(default_factory=lambda: generate_id("sync"))

    # Who submitted this and which device
    user_id: str
    device_id: Optional[str] = None          # optional — frontend can tag device

    # What was done offline
    module: str      # "inventory" | "transaction" | "agency_banking" | "supplier"
    operation: str   # "create" | "update" | "delete"
    record_id: Optional[str] = None          # the local ID the frontend assigned
    payload: dict[str, Any] = {}             # full data submitted by merchant

    # Timing — client_timestamp is when the merchant acted offline
    client_timestamp: datetime = Field(default_factory=utc_now)
    created_at: datetime = Field(default_factory=utc_now)
    synced_at: Optional[datetime] = None

    # State machine
    # pending → synced
    #         → conflict  (server record changed)
    #         → failed    (error during replay)
    #         → skipped   (duplicate detected)
    status: str = "pending"
    retry_count: int = 0
    error_message: Optional[str] = None

    # After successful replay the server assigns a real ID
    server_record_id: Optional[str] = None
