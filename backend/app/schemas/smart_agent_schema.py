from pydantic import BaseModel

class SmartAgentInsightCreate(BaseModel):
    title: str
    insight: str
    recommendation: str
    status: str

class SmartAgentInsightResponse(BaseModel):
    id: str
    title: str
    insight: str
    recommendation: str
    status: str
