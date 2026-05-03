from app.repositories.ledger_repository import LedgerEntryRepository
from app.repositories.inventory_repository import InventoryItemRepository
from app.repositories.procurement_repository import ProcurementRepository
from app.repositories.transaction_repository import TransactionRepository
from app.repositories.agency_banking_repository import AgencyBankingRepository


class DashboardService:
    def __init__(self):
        self.ledger_repo = LedgerEntryRepository()
        self.inventory_repo = InventoryItemRepository()
        self.procurement_repo = ProcurementRepository()
        self.transaction_repo = TransactionRepository()
        self.agency_repo = AgencyBankingRepository()

    async def get_summary(self):
        ledger_items = await self.ledger_repo.list_all()
        inventory_items = await self.inventory_repo.list_all()
        procurement_items = await self.procurement_repo.list_all()
        transactions = await self.transaction_repo.list_all()
        agency_items = await self.agency_repo.list_all()

        # 💰 Income / Expense
        total_income = sum(
            item.get("amount", 0)
            for item in ledger_items
            if item.get("entry_type") == "income"
        )

        total_expense = sum(
            item.get("amount", 0)
            for item in ledger_items
            if item.get("entry_type") == "expense"
        )

        # 📦 Inventory Alerts
        low_stock_count = sum(
            1 for item in inventory_items
            if item.get("quantity", 0) <= item.get("reorder_level", 10)
        )

        # 🛒 Procurement
        pending_procurement_count = sum(
            1 for item in procurement_items
            if item.get("status") == "pending"
        )

        # 🏦 Agency Banking
        agency_balance = sum(
            item.get("amount", 0)
            for item in agency_items
            if item.get("type") == "deposit"
        )

        agency_commission = sum(
            item.get("commission", 0)
            for item in agency_items
        )

        # 📊 Recent Activity
        recent_activity = []

        for txn in transactions[:5]:
            recent_activity.append({
                "type": txn.get("transaction_type", "transaction"),
                "description": txn.get("description", "Transaction record"),
                "amount": txn.get("amount", 0),
                "status": txn.get("status", "completed"),
                "created_at": txn.get("created_at"),
            })

        return {
            "metrics": {
                "income": total_income,
                "expense": total_expense,
                "profit": total_income - total_expense,
                "low_stock": low_stock_count,
                "pending_procurement": pending_procurement_count,
                "agency_balance": agency_balance,
                "agency_commission": agency_commission,
            },
            "recent_activity": recent_activity,
        }