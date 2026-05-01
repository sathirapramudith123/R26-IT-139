from fastapi import HTTPException
from app.models.smart_agent_model import SmartAgentInsight
from app.repositories.smart_agent_repository import SmartAgentInsightRepository

class SmartAgentInsightService:
    def __init__(self):
        self.repository = SmartAgentInsightRepository()

    async def create(self, data: dict):
        payload = SmartAgentInsight(**data).model_dump()
        return await self.repository.create(payload)

    async def list_all(self):
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="SmartAgentInsight not found")
        return item
