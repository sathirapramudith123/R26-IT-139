from pydantic import BaseModel

class SavingsRecordCreate(BaseModel):
    target_name: str
    balance: float
    status: str

class SavingsRecordResponse(BaseModel):
    id: str
    target_name: str
    balance: float
    status: str
