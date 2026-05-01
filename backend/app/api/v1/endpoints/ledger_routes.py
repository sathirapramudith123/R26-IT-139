from fastapi import APIRouter
from app.services.ledger_service import LedgerEntryService

router = APIRouter(prefix="/ledger", tags=["ledger"])

@router.get("")
async def list_items():
    return await LedgerEntryService().list_all()

@router.get("/summary")
async def summary():
    return await LedgerEntryService().get_summary()

@router.get("/monthly")
async def monthly():
    return await LedgerEntryService().get_monthly_report()