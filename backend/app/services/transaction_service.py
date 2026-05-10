from fastapi import HTTPException

from app.models.transaction_model import Transaction
from app.repositories.transaction_repository import TransactionRepository
from app.services.ledger_service import LedgerEntryService


class TransactionService:
    def __init__(self):
        self.repository = TransactionRepository()
        self.ledger_service = LedgerEntryService()

    def resolve_entry_type(self, transaction_type: str, category: str):
        if transaction_type in {"sale", "deposit"}:
            return "income"

        if transaction_type in {"purchase", "expense"}:
            return "expense"

        if category in {"sales", "cash_deposit", "qr_payment", "agency_banking"}:
            return "income"

        return "expense"

    async def create(self, data: dict):
        payload = Transaction(**data).model_dump()

        transaction = await self.repository.create(payload)

        entry_type = self.resolve_entry_type(
            data["transaction_type"],
            data["category"],
        )

        await self.ledger_service.create({
            "title": data["description"],
            "amount": data["amount"],
            "entry_type": entry_type,
            "category": data["category"],
            "payment_method": data["payment_method"],
            "source_transaction_id": transaction["id"],
            "status": data["status"],
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