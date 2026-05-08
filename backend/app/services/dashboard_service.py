from app.core.database import MongoDB
from app.repositories.ledger_repository import LedgerEntryRepository
from app.repositories.inventory_repository import InventoryItemRepository
from app.repositories.procurement_repository import ProcurementRepository
from app.repositories.agency_banking_repository import AgencyBankingRepository


class DashboardService:
    def __init__(self):
        # All repositories that use MongoDB directly — no db injection needed
        self.ledger_repo      = LedgerEntryRepository()
        self.inventory_repo   = InventoryItemRepository()
        self.procurement_repo = ProcurementRepository()
        self.agency_repo      = AgencyBankingRepository()

    async def get_summary(self):
        ledger_items      = await self.ledger_repo.list_all()
        inventory_items   = await self.inventory_repo.list_all()
        procurement_items = await self.procurement_repo.list_all()
        agency_items      = await self.agency_repo.list_all()

        # ── Financial summary from ledger ─────────────────────────────────
        total_income  = sum(
            i.get("amount", 0) for i in ledger_items
            if i.get("entry_type") == "income"
        )
        total_expense = sum(
            i.get("amount", 0) for i in ledger_items
            if i.get("entry_type") == "expense"
        )

        # ── Inventory ─────────────────────────────────────────────────────
        low_stock_count = sum(
            1 for i in inventory_items
            if i.get("quantity", 0) <= i.get("reorder_level", 0)
        )

        # ── Procurement ───────────────────────────────────────────────────
        pending_procurement = sum(
            1 for i in procurement_items
            if i.get("status") == "pending"
        )

        # ── Agency banking ────────────────────────────────────────────────
        # Fix: use actual agency banking totals, not ledger deposit type
        completed_agency = [
            i for i in agency_items if i.get("status") == "completed"
        ]
        agency_balance = sum(
            i.get("agent_cash_balance", 0) for i in completed_agency
        )
        agency_commission = sum(
            i.get("commission", 0) for i in agency_items
        )

        # ── Recent activity from ledger entries ───────────────────────────
        recent_activity = [
            {
                "type":        item.get("entry_type", "ledger"),
                "description": item.get("title", "Ledger entry"),
                "amount":      item.get("amount", 0),
                "status":      item.get("status", "completed"),
                "created_at":  item.get("created_at"),
            }
            for item in ledger_items[:5]
        ]

        return {
            "metrics": {
                "income":               total_income,
                "expense":              total_expense,
                "profit":               total_income - total_expense,
                "low_stock":            low_stock_count,
                "pending_procurement":  pending_procurement,
                "agency_balance":       agency_balance,
                "agency_commission":    agency_commission,
            },
            "recent_activity": recent_activity,
        }
