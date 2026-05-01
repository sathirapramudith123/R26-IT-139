from fastapi import HTTPException
from app.models.term_vault_model import TermVault
from app.repositories.term_vault_repository import TermVaultRepository

class TermVaultService:
    def __init__(self):
        self.repository = TermVaultRepository()

    async def create(self, data: dict):
        payload = TermVault(**data).model_dump()
        return await self.repository.create(payload)

    async def list_all(self):
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="TermVault not found")
        return item
