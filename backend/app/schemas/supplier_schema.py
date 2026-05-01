from datetime import datetime
import re

from pydantic import BaseModel, Field, EmailStr, field_validator


SRI_LANKAN_MOBILE_PATTERN = r"^(07[01245678][0-9]{7}|\+947[01245678][0-9]{7})$"


class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1)
    company_name: str = Field(..., min_length=1)
    contact_number: str = Field(..., min_length=1)
    email: EmailStr
    address: str = ""
    status: str = "active"

    price_score: float = Field(default=0, ge=0, le=100)
    reliability_score: float = Field(default=0, ge=0, le=100)
    delivery_score: float = Field(default=0, ge=0, le=100)

    @field_validator("name", "company_name", "contact_number", "address", "status")
    @classmethod
    def strip_text(cls, value: str):
        return value.strip() if isinstance(value, str) else value

    @field_validator("contact_number")
    @classmethod
    def validate_contact_number(cls, value: str):
        if not re.match(SRI_LANKAN_MOBILE_PATTERN, value):
            raise ValueError(
                "Invalid Sri Lankan mobile number. Use 0771234567 or +94771234567"
            )
        return value


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SupplierBase):
    pass


class SupplierResponse(BaseModel):
    id: str
    name: str
    company_name: str = "N/A"
    contact_number: str
    email: str = "N/A"
    address: str = ""
    status: str

    price_score: float = 0
    reliability_score: float = 0
    delivery_score: float = 0
    total_score: float = 0

    created_at: datetime
    updated_at: datetime


class SupplierDeleteResponse(BaseModel):
    message: str