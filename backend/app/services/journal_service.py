"""
JournalService — double-entry journal management.

Methods:
  create_from_transaction   — auto-create journal entry when transaction is created
  update_from_transaction   — update journal when transaction is edited
  delete_from_transaction   — delete journal when transaction is deleted
  get_all                   — paginated journal entries for a user
  get_by_transaction        — single entry by transaction id
  trial_balance             — debit/credit totals per account code (balanced check)
  account_balances          — running balance per account code
"""

from collections import defaultdict

from app.repositories.journal_repository import JournalEntryRepository
from app.models.journal_model import ACCOUNT_NAMES


# ── Account code helpers ──────────────────────────────────────────────────────

ACCOUNT_TYPES = {
    "1001": "asset",
    "1002": "asset",
    "4001": "revenue",
    "5001": "expense",
    "6001": "expense",
    "6002": "expense",
    "6003": "expense",
    "6004": "expense",
}


def _get_cash_account(payment_method: str) -> str:
    if payment_method == "cash":
        return "1001"
    return "1002"


def _get_expense_account(category: str = None) -> str:
    mapping = {
        "utilities":        "6001",
        "rent":             "6002",
        "supplier_payment": "6004",
    }
    return mapping.get(category, "6003")


def _build_journal_lines(
    transaction_type: str,
    payment_method: str,
    amount: float,
    category: str = None,
) -> list[dict]:
    """
    Build balanced double-entry lines.
    Every debit total must equal every credit total.

      sale       DR cash/bank          CR Sales Revenue
      purchase   DR Cost of Goods      CR cash/bank
      expense    DR expense account    CR cash/bank
      deposit    DR Bank               CR Cash
      transfer   DR Cash               CR Bank
    """
    cash_account = _get_cash_account(payment_method)
    cash_name    = ACCOUNT_NAMES[cash_account]

    if transaction_type == "sale":
        return [
            {"account_code": cash_account, "account_name": cash_name,
             "entry_type": "debit",  "amount": amount},
            {"account_code": "4001", "account_name": ACCOUNT_NAMES["4001"],
             "entry_type": "credit", "amount": amount},
        ]

    if transaction_type == "purchase":
        return [
            {"account_code": "5001", "account_name": ACCOUNT_NAMES["5001"],
             "entry_type": "debit",  "amount": amount},
            {"account_code": cash_account, "account_name": cash_name,
             "entry_type": "credit", "amount": amount},
        ]

    if transaction_type == "expense":
        exp_code = _get_expense_account(category)
        return [
            {"account_code": exp_code, "account_name": ACCOUNT_NAMES[exp_code],
             "entry_type": "debit",  "amount": amount},
            {"account_code": cash_account, "account_name": cash_name,
             "entry_type": "credit", "amount": amount},
        ]

    if transaction_type == "deposit":
        return [
            {"account_code": "1002", "account_name": ACCOUNT_NAMES["1002"],
             "entry_type": "debit",  "amount": amount},
            {"account_code": "1001", "account_name": ACCOUNT_NAMES["1001"],
             "entry_type": "credit", "amount": amount},
        ]

    if transaction_type == "transfer":
        return [
            {"account_code": "1001", "account_name": ACCOUNT_NAMES["1001"],
             "entry_type": "debit",  "amount": amount},
            {"account_code": "1002", "account_name": ACCOUNT_NAMES["1002"],
             "entry_type": "credit", "amount": amount},
        ]

    return []


# ── JournalService ────────────────────────────────────────────────────────────

class JournalService:
    def __init__(self, journal_repo: JournalEntryRepository):
        self.journal_repo = journal_repo

    # ── Transaction-driven journal management ─────────────────────────────────

    async def create_from_transaction(self, transaction: dict) -> dict:
        lines = _build_journal_lines(
            transaction["transaction_type"],
            transaction["payment_method"],
            transaction["amount"],
            transaction.get("category"),
        )
        entry = {
            "transaction_id": str(transaction["_id"]),
            "user_id":        transaction["user_id"],
            "description":    transaction.get("description") or "",
            "lines":          lines,
            "date":           transaction["date"],
        }
        return await self.journal_repo.create(entry)

    async def update_from_transaction(self, transaction: dict) -> dict:
        lines = _build_journal_lines(
            transaction["transaction_type"],
            transaction["payment_method"],
            transaction["amount"],
            transaction.get("category"),
        )
        data = {
            "description": transaction.get("description") or "",
            "lines":       lines,
            "date":        transaction["date"],
        }
        return await self.journal_repo.update_by_transaction_id(
            str(transaction["_id"]), data
        )

    async def delete_from_transaction(self, transaction_id: str) -> bool:
        return await self.journal_repo.delete_by_transaction_id(transaction_id)

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_all(
        self, user_id: str, skip: int = 0, limit: int = 50
    ) -> list[dict]:
        return await self.journal_repo.get_all(user_id, skip, limit)

    async def get_by_transaction(self, transaction_id: str) -> dict | None:
        return await self.journal_repo.get_by_transaction_id(transaction_id)

    # ── Trial Balance ─────────────────────────────────────────────────────────

    async def trial_balance(self) -> dict:
        """
        Aggregate all journal lines across every entry and produce a
        trial balance — one row per account code showing total debits,
        total credits, and the running balance.

        A balanced set of books means:  total_debits == total_credits.

        Returns:
        {
            "rows": [
                {
                    "account_code":  "1001",
                    "account_name":  "Cash on Hand",
                    "account_type":  "asset",
                    "debit_total":   15000.0,
                    "credit_total":  8000.0,
                    "balance":       7000.0
                },
                ...
            ],
            "total_debits":  XXXXX,
            "total_credits": XXXXX,
            "balanced":      true | false
        }
        """
        entries = await self.journal_repo.list_all()

        debits:  dict[str, float] = defaultdict(float)
        credits: dict[str, float] = defaultdict(float)

        for entry in entries:
            for line in entry.get("lines", []):
                code       = line.get("account_code", "")
                amount     = float(line.get("amount", 0) or 0)
                entry_type = line.get("entry_type", "")

                if entry_type == "debit":
                    debits[code] += amount
                elif entry_type == "credit":
                    credits[code] += amount

        all_codes = sorted(set(list(debits.keys()) + list(credits.keys())))

        rows = []
        for code in all_codes:
            debit_total  = round(debits[code],  2)
            credit_total = round(credits[code], 2)
            balance      = round(debit_total - credit_total, 2)

            rows.append({
                "account_code":  code,
                "account_name":  ACCOUNT_NAMES.get(code, f"Account {code}"),
                "account_type":  ACCOUNT_TYPES.get(code, "other"),
                "debit_total":   debit_total,
                "credit_total":  credit_total,
                "balance":       balance,
            })

        total_debits  = round(sum(debits.values()),  2)
        total_credits = round(sum(credits.values()), 2)

        return {
            "rows":          rows,
            "total_debits":  total_debits,
            "total_credits": total_credits,
            "balanced":      total_debits == total_credits,
        }

    # ── Account Balances ──────────────────────────────────────────────────────

    async def account_balances(self) -> list[dict]:
        """
        Return the current running balance for every account code.

        Balance rules per account type:
          asset    → debit increases, credit decreases  (balance = DR - CR)
          revenue  → credit increases, debit decreases  (balance = CR - DR)
          expense  → debit increases, credit decreases  (balance = DR - CR)
        """
        entries = await self.journal_repo.list_all()

        debits:  dict[str, float] = defaultdict(float)
        credits: dict[str, float] = defaultdict(float)

        for entry in entries:
            for line in entry.get("lines", []):
                code       = line.get("account_code", "")
                amount     = float(line.get("amount", 0) or 0)
                entry_type = line.get("entry_type", "")

                if entry_type == "debit":
                    debits[code] += amount
                elif entry_type == "credit":
                    credits[code] += amount

        all_codes = sorted(set(list(debits.keys()) + list(credits.keys())))

        result = []
        for code in all_codes:
            acct_type    = ACCOUNT_TYPES.get(code, "other")
            debit_total  = debits[code]
            credit_total = credits[code]

            if acct_type == "revenue":
                balance     = round(credit_total - debit_total, 2)
                normal_side = "credit"
            else:
                balance     = round(debit_total - credit_total, 2)
                normal_side = "debit"

            result.append({
                "account_code": code,
                "account_name": ACCOUNT_NAMES.get(code, f"Account {code}"),
                "account_type": acct_type,
                "balance":      balance,
                "normal_side":  normal_side,
            })

        return result