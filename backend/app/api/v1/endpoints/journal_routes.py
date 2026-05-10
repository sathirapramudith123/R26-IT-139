from fastapi import APIRouter
from app.services.journal_service import JournalService
from app.repositories.journal_repository import JournalEntryRepository

router = APIRouter(prefix="/journal", tags=["journal"])

def get_service():
    return JournalService(JournalEntryRepository())

@router.get("")
async def list_journal_entries():
    return await get_service().journal_repo.list_all()

@router.get("/trial-balance")
async def trial_balance():
    return await get_service().trial_balance()

@router.get("/accounts")
async def account_balances():
    return await get_service().account_balances()

@router.get("/transaction/{transaction_id}")
async def get_by_transaction(transaction_id: str):
    return await get_service().get_by_transaction(transaction_id)
