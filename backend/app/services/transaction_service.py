from fastapi import HTTPException
from app.models.transaction_model import Transaction
from app.repositories.transaction_repository import TransactionRepository
from app.services.ledger_service import LedgerEntryService

class TransactionService:
    def __init__(self):
        self.repository = TransactionRepository()
        self.ledger_service = LedgerEntryService()

    async def create(self, data: dict):
        payload = Transaction(**data).model_dump()

        # Save transaction
        transaction = await self.repository.create(payload)

        # 🔥 AUTO UPDATE LEDGER
        entry_type = "income" if data["transaction_type"] == "sale" else "expense"

        await self.ledger_service.create({
            "title": data["description"],
            "amount": data["amount"],
            "entry_type": entry_type,
            "status": data["status"]
        })

        return transaction

    async def list_all(self):
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return item

    async def get_history(self):
        return await self.repository.list_all()