def ensure_non_negative(value: float | int, field_name: str):
    if value < 0:
        raise ValueError(f"{field_name} must be >= 0")
    return value
