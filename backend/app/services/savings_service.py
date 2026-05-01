from fastapi import HTTPException
from app.models.savings_model import SavingsRecord
from app.repositories.savings_repository import SavingsRecordRepository

class SavingsRecordService:
    def __init__(self):
        self.repository = SavingsRecordRepository()

    async def create(self, data: dict):
        payload = SavingsRecord(**data).model_dump()
        return await self.repository.create(payload)

    async def list_all(self):
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="SavingsRecord not found")
        return item
