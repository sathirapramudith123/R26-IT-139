from datetime import datetime, timezone
from uuid import uuid4


def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)