"""
LedgerService — manages ledger entries and derives financial summaries.

LedgerService now derives summaries purely from ledger_entries collection
(which is the correct source for the /ledger endpoints).

Transactions have their own summary via TransactionService.get_summary()
which is properly db-injected through deps.py.
"""

from collections import defaultdict
from datetime import datetime
from fastapi import HTTPException

from app.repositories.ledger_repository import LedgerEntryRepository


INCOME_CATEGORIES  = {"income", "sales", "agency_banking"}
EXPENSE_CATEGORIES = {"expense", "supplier_payment", "utilities", "rent", "general"}


class LedgerService:
    def __init__(self):
        self.ledger_repo = LedgerEntryRepository()

    # ── CRUD ──────────────────────────────────────────────────────────────

    async def list_entries(self):
        return await self.ledger_repo.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.ledger_repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Ledger entry not found")
        return item

    async def create(self, data: dict):
        return await self.ledger_repo.create(data)

    async def update(self, item_id: str, data: dict):
        existing = await self.ledger_repo.get_by_id(item_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Ledger entry not found")
        return await self.ledger_repo.update(item_id, data)

    async def delete(self, item_id: str):
        deleted = await self.ledger_repo.delete(item_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Delete failed")
        return {"message": "Ledger entry deleted successfully"}

    # ── Summaries (derived from ledger entries) ───────────────────────────

    async def summary(self):
        """
        Derive income / expense / profit / cash balance
        """
        entries       = await self.ledger_repo.list_all()
        total_income  = 0.0
        total_expense = 0.0
        cash_balance  = 0.0

        for entry in entries:
            amount     = float(entry.get("amount", 0) or 0)
            entry_type = entry.get("entry_type", "")

            if entry_type == "income":
                total_income += amount
                if entry.get("payment_method") == "cash":
                    cash_balance += amount
            elif entry_type == "expense":
                total_expense += amount
                if entry.get("payment_method") == "cash":
                    cash_balance -= amount

        return {
            "total_income":      round(total_income, 2),
            "total_expense":     round(total_expense, 2),
            "net_profit":        round(total_income - total_expense, 2),
            "cash_balance":      round(cash_balance, 2),
            "transaction_count": len(entries),
        }

    async def payment_split(self):
        """Break down total amounts by payment method."""
        entries = await self.ledger_repo.list_all()
        result: dict[str, float] = {}
        for entry in entries:
            method         = entry.get("payment_method", "cash")
            result[method] = round(
                result.get(method, 0) + float(entry.get("amount", 0) or 0), 2
            )
        return result

    async def reports(self):
        """Monthly, category, type, and payment breakdowns from ledger entries."""
        entries     = await self.ledger_repo.list_all()
        monthly     = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
        by_category = defaultdict(float)
        by_type     = defaultdict(float)
        by_payment  = defaultdict(float)

        for entry in entries:
            amount     = float(entry.get("amount", 0) or 0)
            entry_type = entry.get("entry_type", "other")
            category   = entry.get("category", "other")
            method     = entry.get("payment_method", "cash")

            raw_date  = entry.get("created_at")
            month_key = "unknown"
            if raw_date:
                try:
                    dt = (
                        raw_date
                        if not isinstance(raw_date, str)
                        else datetime.fromisoformat(
                            raw_date.replace("Z", "+00:00")
                        )
                    )
                    month_key = dt.strftime("%Y-%m")
                except Exception:
                    pass

            if entry_type == "income":
                monthly[month_key]["income"] += amount
            elif entry_type == "expense":
                monthly[month_key]["expense"] += amount

            by_category[category] += amount
            by_type[entry_type]   += amount
            by_payment[method]    += amount

        return {
            "monthly": [
                {"month": k, **v}
                for k, v in sorted(monthly.items())
            ],
            "by_category":        dict(by_category),
            "by_type":            dict(by_type),
            "by_payment":         dict(by_payment),
            "total_transactions": len(entries),
        }


# Backward-compatibility alias
LedgerEntryService = LedgerService
