from pydantic import BaseModel

class TermVaultCreate(BaseModel):
    name: str
    member_count: int
    status: str

class TermVaultResponse(BaseModel):
    id: str
    name: str
    member_count: int
    status: str
