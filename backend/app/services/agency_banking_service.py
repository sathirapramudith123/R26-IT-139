from fastapi import HTTPException, status

from app.models.agency_banking_model import AgencyBankingTransaction
from app.repositories.agency_banking_repository import AgencyBankingRepository
from app.services.ledger_service import LedgerEntryService
from app.utils.helpers import generate_id


class AgencyBankingService:
    def __init__(self):
        self.repository = AgencyBankingRepository()
        self.ledger_service = LedgerEntryService()

    def calculate_service_fee(self, transaction_type: str, amount: float) -> float:
        if transaction_type == "balance_inquiry":
            return 10.0

        return round(amount * 0.01, 2)

    def calculate_commission(self, service_fee: float) -> float:
        return round(service_fee * 0.60, 2)

    def calculate_agent_cash_balance(
        self,
        transaction_type: str,
        amount: float,
        current_balance: float,
    ) -> float:
        if transaction_type == "cash_deposit":
            return current_balance + amount

        if transaction_type == "cash_withdrawal":
            if current_balance < amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient agent cash balance for withdrawal"
                )
            return current_balance - amount

        return current_balance

    async def create(self, data: dict):
        service_fee = self.calculate_service_fee(
            data["transaction_type"],
            data["amount"]
        )

        commission = self.calculate_commission(service_fee)

        updated_cash_balance = self.calculate_agent_cash_balance(
            data["transaction_type"],
            data["amount"],
            data.get("agent_cash_balance", 0)
        )

        data["service_fee"] = service_fee
        data["commission"] = commission
        data["agent_cash_balance"] = updated_cash_balance
        data["reference_number"] = generate_id("ref").upper()

        payload = AgencyBankingTransaction(**data).model_dump()
        transaction = await self.repository.create(payload)

        if data["status"] == "completed" and commission > 0:
            await self.ledger_service.create({
                "title": f"Agency banking commission - {data['transaction_type'].replace('_', ' ')}",
                "amount": commission,
                "entry_type": "income",
                "category": "agency_banking",
                "payment_method": "cash",
                "source_transaction_id": transaction["id"],
                "status": "completed",
            })

        return transaction

    async def list_all(self):
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agency banking transaction not found"
            )

        return item

    async def update(self, item_id: str, data: dict):
        existing = await self.repository.get_by_id(item_id)

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agency banking transaction not found"
            )

        clean_data = {
            key: value
            for key, value in data.items()
            if value is not None
        }

        updated_payload = {
            **existing,
            **clean_data,
        }

        service_fee = self.calculate_service_fee(
            updated_payload["transaction_type"],
            updated_payload["amount"]
        )

        commission = self.calculate_commission(service_fee)

        updated_payload["service_fee"] = service_fee
        updated_payload["commission"] = commission

        item = await self.repository.update(item_id, updated_payload)

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agency banking transaction not found"
            )

        return item

    async def delete(self, item_id: str):
        existing = await self.repository.get_by_id(item_id)

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agency banking transaction not found"
            )

        deleted = await self.repository.delete(item_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete agency banking transaction"
            )

        return {"message": "Agency banking transaction deleted successfully"}

    async def get_summary(self):
        items = await self.repository.list_all()

        return {
            "total_transactions": len(items),
            "total_amount": sum(item.get("amount", 0) for item in items),
            "total_service_fees": sum(item.get("service_fee", 0) for item in items),
            "total_commission": sum(item.get("commission", 0) for item in items),
            "completed_transactions": len([
                item for item in items if item.get("status") == "completed"
            ]),
            "failed_transactions": len([
                item for item in items if item.get("status") == "failed"
            ]),
        }