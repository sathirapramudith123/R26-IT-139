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

    # 🔥 Financial Summary
    async def get_summary(self):
        items = await self.repository.list_all()

        income = sum(i["amount"] for i in items if i["entry_type"] == "income")
        expense = sum(i["amount"] for i in items if i["entry_type"] == "expense")

        return {
            "total_income": income,
            "total_expense": expense,
            "profit": income - expense
        }

    # 🔥 Monthly Report
    async def get_monthly_report(self):
        items = await self.repository.list_all()
        report = {}

        for item in items:
            month = item["created_at"].strftime("%Y-%m")

            if month not in report:
                report[month] = {"income": 0, "expense": 0}

            if item["entry_type"] == "income":
                report[month]["income"] += item["amount"]
            else:
                report[month]["expense"] += item["amount"]

        return report