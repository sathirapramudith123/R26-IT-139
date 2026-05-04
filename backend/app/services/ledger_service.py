import csv
import io

from fastapi import HTTPException, status

from app.models.ledger_model import LedgerEntry
from app.repositories.ledger_repository import LedgerEntryRepository


class LedgerEntryService:
    def __init__(self):
        self.repository = LedgerEntryRepository()

    async def create(self, data: dict):
        payload = LedgerEntry(**data).model_dump()
        return await self.repository.create(payload)

    async def list_all(self):
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ledger entry not found",
            )

        return item

    async def update(self, item_id: str, data: dict):
        existing = await self.repository.get_by_id(item_id)

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ledger entry not found",
            )

        updated_payload = {**existing, **data}
        return await self.repository.update(item_id, updated_payload)

    async def delete(self, item_id: str):
        existing = await self.repository.get_by_id(item_id)

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ledger entry not found",
            )

        deleted = await self.repository.delete(item_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete ledger entry",
            )

        return {"message": "Ledger entry deleted successfully"}

    async def get_summary(self):
        items = await self.repository.list_all()

        total_income = sum(
            item.get("amount", 0)
            for item in items
            if item.get("entry_type") == "income"
        )

        total_expense = sum(
            item.get("amount", 0)
            for item in items
            if item.get("entry_type") == "expense"
        )

        cash_income = sum(
            item.get("amount", 0)
            for item in items
            if item.get("entry_type") == "income"
            and item.get("payment_method") == "cash"
        )

        cash_expense = sum(
            item.get("amount", 0)
            for item in items
            if item.get("entry_type") == "expense"
            and item.get("payment_method") == "cash"
        )

        return {
            "total_income": total_income,
            "total_expense": total_expense,
            "net_profit": total_income - total_expense,
            "cash_balance": cash_income - cash_expense,
        }

    async def get_monthly_report(self):
        items = await self.repository.list_all()
        report = {}

        for item in items:
            created_at = item.get("created_at")

            if not created_at:
                continue

            month = created_at.strftime("%Y-%m")

            if month not in report:
                report[month] = {
                    "monthly_income": 0,
                    "monthly_expense": 0,
                    "monthly_profit": 0,
                    "transaction_count": 0,
                }

            if item.get("entry_type") == "income":
                report[month]["monthly_income"] += item.get("amount", 0)

            if item.get("entry_type") == "expense":
                report[month]["monthly_expense"] += item.get("amount", 0)

            report[month]["monthly_profit"] = (
                report[month]["monthly_income"]
                - report[month]["monthly_expense"]
            )

            report[month]["transaction_count"] += 1

        return report

    async def get_payment_split(self):
        items = await self.repository.list_all()

        split = {
            "cash": 0,
            "qr_payment": 0,
            "bank_transfer": 0,
            "mobile_payment": 0,
        }

        for item in items:
            method = item.get("payment_method", "cash")
            if method in split:
                split[method] += item.get("amount", 0)

        return split

    async def export_csv(self):
        items = await self.repository.list_all()

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "ID",
            "Title",
            "Amount",
            "Entry Type",
            "Category",
            "Payment Method",
            "Status",
            "Created At",
        ])

        for item in items:
            writer.writerow([
                item.get("id"),
                item.get("title"),
                item.get("amount"),
                item.get("entry_type"),
                item.get("category"),
                item.get("payment_method"),
                item.get("status"),
                item.get("created_at"),
            ])

        return output.getvalue()