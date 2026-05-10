from fastapi import APIRouter, status, Depends
from datetime import datetime
from typing import Optional
from fastapi.responses import StreamingResponse
import io

from app.schemas.transaction_schema import (
    TransactionCreate, TransactionUpdate,
    TransactionResponse, LedgerSummaryResponse, ReportsResponse
)
from app.schemas.journal_schema import JournalEntryResponse
from app.services.transaction_service import TransactionService
from app.api.deps import get_current_user, get_transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    current_user: dict = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
):
    return await service.create_transaction(current_user["id"], data)


@router.get("/summary", response_model=LedgerSummaryResponse)
async def get_summary(
    current_user: dict = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
):
    return await service.get_summary(current_user["id"])


@router.get("/reports", response_model=ReportsResponse)
async def get_reports(
    current_user: dict = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
):
    return await service.get_reports(current_user["id"])


@router.get("/journal", response_model=list[JournalEntryResponse])
async def get_journal(
    current_user: dict = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
):
    return await service.get_journal_entries(current_user["id"])


@router.get("/export/pdf")
async def export_pdf(
    current_user: dict = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    summary      = await service.get_summary(current_user["id"])
    transactions = await service.get_all_transactions(current_user["id"], limit=200)

    buffer = io.BytesIO()
    doc    = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elems  = []

    elems.append(Paragraph("Lanka-Link — Financial Ledger Report", styles["Title"]))
    elems.append(Spacer(1, 12))
    elems.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC", styles["Normal"]))
    elems.append(Spacer(1, 20))

    summary_data = [
        ["Metric", "Amount (LKR)"],
        ["Total Income",   f"{summary['total_income']:,.2f}"],
        ["Total Expenses", f"{summary['total_expenses']:,.2f}"],
        ["Net Profit",     f"{summary['net_profit']:,.2f}"],
        ["Cash Balance",   f"{summary['cash_balance']:,.2f}"],
        ["Bank Balance",   f"{summary['bank_balance']:,.2f}"],
    ]
    st = Table(summary_data, colWidths=[250, 200])
    st.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,0), colors.HexColor("#1D9E75")),
        ("TEXTCOLOR",  (0,0),(-1,0), colors.white),
        ("FONTNAME",   (0,0),(-1,0), "Helvetica-Bold"),
        ("GRID",       (0,0),(-1,-1), 0.5, colors.grey),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#f5f5f5")]),
    ]))
    elems.append(st)
    elems.append(Spacer(1, 24))
    elems.append(Paragraph("Transactions", styles["Heading2"]))
    elems.append(Spacer(1, 8))

    txn_data = [["Date", "Type", "Method", "Description", "Amount"]]
    for t in transactions:
        txn_data.append([
            t["date"].strftime("%Y-%m-%d") if isinstance(t["date"], datetime) else str(t["date"])[:10],
            t["transaction_type"].upper(),
            t["payment_method"].upper(),
            t["description"][:40],
            f"LKR {t['amount']:,.2f}",
        ])
    tt = Table(txn_data, colWidths=[70,70,60,200,90])
    tt.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,0), colors.HexColor("#0F6E56")),
        ("TEXTCOLOR", (0,0),(-1,0), colors.white),
        ("FONTNAME",  (0,0),(-1,0), "Helvetica-Bold"),
        ("FONTSIZE",  (0,0),(-1,-1), 8),
        ("GRID",      (0,0),(-1,-1), 0.3, colors.grey),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, colors.HexColor("#f9f9f9")]),
    ]))
    elems.append(tt)
    doc.build(elems)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=ledger-report.pdf"})


@router.get("", response_model=list[TransactionResponse])
async def get_transactions(
    current_user: dict = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
):
    return await service.get_all_transactions(current_user["id"])


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
):
    return await service.get_transaction(transaction_id, current_user["id"])


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    current_user: dict = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
):
    return await service.update_transaction(transaction_id, current_user["id"], data)


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service),
):
    return await service.delete_transaction(transaction_id, current_user["id"])
