import uuid
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from app.repositories.transaction_repository import TransactionRepository
from app.services.journal_service import JournalService
from app.schemas.transaction_schema import TransactionCreate, TransactionUpdate


class TransactionService:
    def __init__(self, transaction_repo: TransactionRepository, journal_service: JournalService):
        self.transaction_repo = transaction_repo
        self.journal_service  = journal_service

    def _generate_reference(self, transaction_type: str) -> str:
        prefix = {
            "sale":     "SL",
            "purchase": "PU",
            "expense":  "EX",
            "deposit":  "DP",
            "transfer": "TR",
        }.get(transaction_type, "TX")
        return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

    def _serialize(self, doc: dict) -> dict:
        """Convert _id → id. Operates on a copy so original is not mutated."""
        if not doc:
            return doc
        result = dict(doc)
        if "_id" in result:
            result["id"] = str(result.pop("_id"))
        return result

    async def create_transaction(self, user_id: str, data: TransactionCreate) -> dict:
        raw = data.model_dump()

        # Strip inventory-only fields — handled separately, not stored on transaction
        item_name = raw.pop("item_name", None)
        quantity  = raw.pop("quantity",  None)

        # Build transaction document — exclude None values
        transaction_dict = {k: v for k, v in raw.items() if v is not None}
        transaction_dict["user_id"]          = user_id
        transaction_dict["reference_number"] = self._generate_reference(data.transaction_type)
        transaction_dict["status"]           = "completed"
        transaction_dict["description"]      = (raw.get("description") or "").strip()
        transaction_dict["created_at"]       = datetime.utcnow()
        transaction_dict["updated_at"]       = datetime.utcnow()

        if not transaction_dict.get("date"):
            transaction_dict["date"] = datetime.utcnow()

        # Insert and fetch — do NOT rely on mutated dict, use find_one by inserted_id
        result = await self.transaction_repo.collection.insert_one(transaction_dict)
        created = await self.transaction_repo.collection.find_one(
            {"_id": result.inserted_id}
        )

        if not created:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Transaction was inserted but could not be retrieved."
            )

        # Auto-sync inventory — failure must never block the transaction save
        if item_name and quantity:
            try:
                from app.repositories.inventory_repository import InventoryItemRepository
                inv_repo = InventoryItemRepository()
                item = await inv_repo.get_by_name(item_name)
                if item:
                    current_qty = float(item.get("quantity", 0))
                    if data.transaction_type == "sale":
                        new_qty = max(0, current_qty - float(quantity))
                    else:
                        new_qty = current_qty + float(quantity)
                    await inv_repo.collection.update_one(
                        {"name": {"$regex": f"^{item_name}$", "$options": "i"}},
                        {"$set": {"quantity": new_qty, "updated_at": datetime.utcnow()}}
                    )
            except Exception:
                pass

        # Journal entry uses the raw MongoDB doc which still has _id
        await self.journal_service.create_from_transaction(created)

        return self._serialize(created)

    async def get_transaction(self, transaction_id: str, user_id: str) -> dict:
        txn = await self.transaction_repo.get_by_id(transaction_id, user_id)
        if not txn:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Transaction not found")
        return self._serialize(txn)

    async def get_all_transactions(
        self, user_id: str, skip: int = 0, limit: int = 50,
        transaction_type: Optional[str] = None,
        payment_method:   Optional[str] = None,
        start_date:       Optional[datetime] = None,
        end_date:         Optional[datetime] = None,
    ) -> list[dict]:
        results = await self.transaction_repo.get_all(
            user_id, skip, limit, transaction_type, payment_method, start_date, end_date
        )
        return [self._serialize(t) for t in results]

    async def update_transaction(self, transaction_id: str, user_id: str,
                                 data: TransactionUpdate) -> dict:
        existing = await self.transaction_repo.get_by_id(transaction_id, user_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Transaction not found")
        raw = data.model_dump()
        raw.pop("item_name", None)
        raw.pop("quantity",  None)
        update_data = {k: v for k, v in raw.items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        updated = await self.transaction_repo.update(transaction_id, user_id, update_data)
        await self.journal_service.update_from_transaction(updated)
        return self._serialize(updated)

    async def delete_transaction(self, transaction_id: str, user_id: str) -> dict:
        existing = await self.transaction_repo.get_by_id(transaction_id, user_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Transaction not found")
        await self.journal_service.delete_from_transaction(transaction_id)
        await self.transaction_repo.delete(transaction_id, user_id)
        return {"message": "Transaction deleted successfully"}

    async def get_summary(self, user_id: str) -> dict:
        return await self.transaction_repo.get_summary(user_id)

    async def get_reports(self, user_id: str) -> dict:
        return {
            "monthly":           await self.transaction_repo.get_monthly_report(user_id),
            "by_category":       await self.transaction_repo.get_category_report(user_id),
            "by_payment_method": await self.transaction_repo.get_payment_method_report(user_id),
        }

    async def get_journal_entries(self, user_id: str,
                                  skip: int = 0, limit: int = 50) -> list[dict]:
        entries = await self.journal_service.get_all(user_id, skip, limit)
        return [self._serialize(e) for e in entries]