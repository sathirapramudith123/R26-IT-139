import re
from datetime import datetime
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
    unit_price: float = Field(default=0, ge=0)
    delivery_cost: float = Field(default=0, ge=0)
    available_quantity: float = Field(default=0, ge=0)
    estimated_delivery_date: datetime | None = None

    @field_validator("contact_number")
    @classmethod
    def validate_contact(cls, v):
        if not re.match(SRI_LANKAN_MOBILE_PATTERN, v):
            raise ValueError("Invalid Sri Lankan mobile number")
        return v

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(SupplierBase):
    pass

class SupplierResponse(BaseModel):
    id: str
    name: str
    company_name: str
    contact_number: str
    email: str
    address: str
    status: str
    price_score: float = 0
    reliability_score: float = 0
    delivery_score: float = 0
    total_score: float = 0
    unit_price: float = 0
    delivery_cost: float = 0
    available_quantity: float = 0
    estimated_delivery_date: datetime | None = None
    created_at: datetime
    updated_at: datetime

class SupplierDeleteResponse(BaseModel):
    message: str
