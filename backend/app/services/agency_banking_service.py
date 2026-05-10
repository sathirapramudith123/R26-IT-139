from datetime import datetime, timezone
from fastapi import HTTPException, status

from app.models.agency_banking_model import AgencyBankingTransaction
from app.repositories.agency_banking_repository import AgencyBankingRepository
from app.services.ledger_service import LedgerService
from app.utils.helpers import generate_id


TRANSACTION_LIMITS = {
    "cash_deposit":    {"min": 100,   "max": 500_000},
    "cash_withdrawal": {"min": 100,   "max": 200_000},
    "fund_transfer":   {"min": 100,   "max": 100_000},
    "balance_inquiry": {"min": 0,     "max": 0},
}

DAILY_LIMIT_PER_TYPE = {
    "cash_deposit":    1_000_000,
    "cash_withdrawal": 500_000,
    "fund_transfer":   300_000,
    "balance_inquiry": 0,
}

MINIMUM_AGENT_FLOAT = 5_000.0

COMMISSION_RATES = {
    "cash_deposit":    {"fee_pct": 0.010, "commission_share": 0.60},
    "cash_withdrawal": {"fee_pct": 0.015, "commission_share": 0.60},
    "fund_transfer":   {"fee_pct": 0.012, "commission_share": 0.60},
    "balance_inquiry": {"fee_flat": 10.0, "commission_share": 0.60},
}


def _to_date(value):
    """
    Safely convert a stored created_at value (datetime or ISO string) to a
    date object in UTC.  Uses proper datetime parsing — not string slicing.
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.date()
        return value.astimezone(timezone.utc).date()
    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return dt.astimezone(timezone.utc).date()
        except ValueError:
            return None
    return None


class AgencyBankingService:
    def __init__(self):
        self.repository     = AgencyBankingRepository()
        self.ledger_service = LedgerService()

    # ── Fee & commission ──────────────────────────────────────────────────────

    def calculate_service_fee(self, transaction_type: str, amount: float) -> float:
        rates = COMMISSION_RATES.get(transaction_type, {})
        if "fee_flat" in rates:
            return rates["fee_flat"]
        return round(amount * rates.get("fee_pct", 0.01), 2)

    def calculate_commission(self, transaction_type: str, service_fee: float) -> float:
        share = COMMISSION_RATES.get(transaction_type, {}).get("commission_share", 0.60)
        return round(service_fee * share, 2)

    # ── CBSL compliance ───────────────────────────────────────────────────────

    def validate_transaction_limits(self, transaction_type: str, amount: float):
        limits = TRANSACTION_LIMITS.get(transaction_type)
        if not limits or transaction_type == "balance_inquiry":
            return
        if amount < limits["min"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Minimum transaction amount for {transaction_type.replace('_', ' ')} "
                       f"is LKR {limits['min']:,}.",
            )
        if amount > limits["max"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum transaction amount for {transaction_type.replace('_', ' ')} "
                       f"is LKR {limits['max']:,} per CBSL guidelines.",
            )

    async def validate_daily_limit(self, transaction_type: str, amount: float):
        daily_cap = DAILY_LIMIT_PER_TYPE.get(transaction_type, 0)
        if daily_cap == 0:
            return

        all_items = await self.repository.list_all()
        today     = datetime.now(timezone.utc).date()

        daily_total = sum(
            item.get("amount", 0)
            for item in all_items
            if item.get("transaction_type") == transaction_type
            and item.get("status") == "completed"
            and _to_date(item.get("created_at")) == today   # ← proper date comparison
        )

        if daily_total + amount > daily_cap:
            remaining = max(0, daily_cap - daily_total)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Daily limit for {transaction_type.replace('_', ' ')} is "
                       f"LKR {daily_cap:,}. Remaining today: LKR {remaining:,}.",
            )

    def validate_agent_float(self, transaction_type: str, amount: float, current_balance: float):
        if transaction_type not in ("cash_withdrawal", "fund_transfer"):
            return
        balance_after = current_balance - amount
        if balance_after < MINIMUM_AGENT_FLOAT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transaction would reduce agent float below minimum required balance "
                       f"of LKR {MINIMUM_AGENT_FLOAT:,.2f}. "
                       f"Current balance: LKR {current_balance:,.2f}.",
            )

    # ── Cash float management ─────────────────────────────────────────────────

    def update_agent_balance(
        self,
        transaction_type: str,
        amount: float,
        current_balance: float,
    ) -> float:
        if transaction_type == "cash_deposit":
            return round(current_balance + amount, 2)
        if transaction_type in ("cash_withdrawal", "fund_transfer"):
            if current_balance < amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient agent cash float for this transaction.",
                )
            return round(current_balance - amount, 2)
        return current_balance

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def create(self, data: dict):
        tx_type         = data["transaction_type"]
        amount          = float(data.get("amount", 0))
        current_balance = float(data.get("agent_cash_balance", 0))

        self.validate_transaction_limits(tx_type, amount)
        await self.validate_daily_limit(tx_type, amount)
        if tx_type != "balance_inquiry":
            self.validate_agent_float(tx_type, amount, current_balance)

        service_fee     = self.calculate_service_fee(tx_type, amount)
        commission      = self.calculate_commission(tx_type, service_fee)
        updated_balance = self.update_agent_balance(tx_type, amount, current_balance)

        data["service_fee"]        = service_fee
        data["commission"]         = commission
        data["agent_cash_balance"] = updated_balance
        data["reference_number"]   = generate_id("ref").upper()

        payload     = AgencyBankingTransaction(**data).model_dump()
        transaction = await self.repository.create(payload)

        if data.get("status") == "completed" and commission > 0:
            try:
                await self.ledger_service.create({
                    "title":                 f"Agency commission — {tx_type.replace('_', ' ')}",
                    "amount":                commission,
                    "entry_type":            "income",
                    "category":              "agency_banking",
                    "payment_method":        "cash",
                    "source_transaction_id": transaction["id"],
                    "status":                "completed",
                })
            except Exception as e:
                print(f"[AgencyBanking] Warning: Could not record commission to ledger: {e}")

        return transaction

    async def list_all(self):
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agency banking transaction not found",
            )
        return item

    async def update(self, item_id: str, data: dict):
        existing = await self.repository.get_by_id(item_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Agency banking transaction not found")

        clean_data      = {k: v for k, v in data.items() if v is not None}
        updated_payload = {**existing, **clean_data}

        tx_type     = updated_payload.get("transaction_type", existing["transaction_type"])
        amount      = float(updated_payload.get("amount", existing.get("amount", 0)))
        service_fee = self.calculate_service_fee(tx_type, amount)
        commission  = self.calculate_commission(tx_type, service_fee)

        updated_payload["service_fee"] = service_fee
        updated_payload["commission"]  = commission

        item = await self.repository.update(item_id, updated_payload)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Agency banking transaction not found")
        return item

    async def delete(self, item_id: str):
        existing = await self.repository.get_by_id(item_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Agency banking transaction not found")
        deleted = await self.repository.delete(item_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail="Failed to delete agency banking transaction")
        return {"message": "Agency banking transaction deleted successfully"}

    async def get_summary(self):
        items       = await self.repository.list_all()
        completed   = [i for i in items if i.get("status") == "completed"]
        today       = datetime.now(timezone.utc).date()
        today_items = [i for i in completed if _to_date(i.get("created_at")) == today]

        return {
            "total_transactions":     len(items),
            "total_amount":           sum(i.get("amount", 0)      for i in items),
            "total_service_fees":     sum(i.get("service_fee", 0) for i in items),
            "total_commission":       sum(i.get("commission", 0)  for i in items),
            "completed_transactions": len(completed),
            "failed_transactions":    len([i for i in items if i.get("status") == "failed"]),
            "today_transactions":     len(today_items),
            "today_amount":           sum(i.get("amount", 0)     for i in today_items),
            "today_commission":       sum(i.get("commission", 0) for i in today_items),
            "limits": {
                k: {"daily_cap": v, "per_txn_max": TRANSACTION_LIMITS[k]["max"]}
                for k, v in DAILY_LIMIT_PER_TYPE.items()
                if k != "balance_inquiry"
            },
        }
