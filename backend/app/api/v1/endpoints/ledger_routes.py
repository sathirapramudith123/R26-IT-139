from fastapi import APIRouter, Response

from app.schemas.ledger_schema import (
    LedgerEntryCreate,
    LedgerEntryResponse,
    LedgerSummaryResponse,
    PaymentSplitResponse,
)
from app.services.ledger_service import LedgerEntryService

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("", response_model=list[LedgerEntryResponse])
async def list_items():
    return await LedgerEntryService().list_all()


@router.get("/summary", response_model=LedgerSummaryResponse)
async def get_summary():
    return await LedgerEntryService().get_summary()


@router.get("/monthly-report")
async def get_monthly_report():
    return await LedgerEntryService().get_monthly_report()


@router.get("/payment-split", response_model=PaymentSplitResponse)
async def get_payment_split():
    return await LedgerEntryService().get_payment_split()


@router.get("/export/csv")
async def export_csv():
    csv_data = await LedgerEntryService().export_csv()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=financial_statement.csv"
        },
    )


@router.get("/{item_id}", response_model=LedgerEntryResponse)
async def get_item(item_id: str):
    return await LedgerEntryService().get_by_id(item_id)


@router.post("", response_model=LedgerEntryResponse)
async def create_item(payload: LedgerEntryCreate):
    return await LedgerEntryService().create(payload.model_dump())


@router.put("/{item_id}", response_model=LedgerEntryResponse)
async def update_item(item_id: str, payload: LedgerEntryCreate):
    return await LedgerEntryService().update(item_id, payload.model_dump())


@router.delete("/{item_id}")
async def delete_item(item_id: str):
    return await LedgerEntryService().delete(item_id)