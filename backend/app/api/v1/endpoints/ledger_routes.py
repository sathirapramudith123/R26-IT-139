from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from io import BytesIO
from datetime import datetime

from app.services.ledger_service import LedgerService
from app.api.deps import get_current_user

router = APIRouter(prefix="/ledger", tags=["ledger"])


# ── Static routes MUST come before /{item_id} ────────────────────────────────

@router.get("")
async def list_entries(current_user: dict = Depends(get_current_user)):
    return await LedgerService().list_entries()


@router.get("/summary")
async def summary(current_user: dict = Depends(get_current_user)):
    return await LedgerService().summary()


@router.get("/payment-split")
async def payment_split(current_user: dict = Depends(get_current_user)):
    return await LedgerService().payment_split()


@router.get("/reports")
async def reports(current_user: dict = Depends(get_current_user)):
    return await LedgerService().reports()


@router.get("/export/pdf")
async def export_pdf(current_user: dict = Depends(get_current_user)):
    """
    Generate and download a PDF financial report.
    Requires Authorization: Bearer <token> header.
    Returns: application/pdf as attachment download.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer,
        Table, TableStyle, HRFlowable
    )
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_CENTER

    # Fetch data
    service  = LedgerService()
    entries  = await service.list_entries()
    summ     = await service.summary()
    p_split  = await service.payment_split()
    rep      = await service.reports()

    # Colours
    TEAL   = HexColor("#0F6E56")
    TEAL_L = HexColor("#E1F5EE")
    GRAY   = HexColor("#5F5E5A")
    GRAY_L = HexColor("#F1EFE8")
    BORDER = HexColor("#D3D1C7")
    RED    = HexColor("#A32D2D")
    GREEN  = HexColor("#085041")

    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    title_s = S("T",  fontSize=20, textColor=TEAL, spaceAfter=4,  alignment=TA_CENTER, fontName="Helvetica-Bold")
    sub_s   = S("Su", fontSize=9,  textColor=GRAY, spaceAfter=10, alignment=TA_CENTER, fontName="Helvetica")
    h1_s    = S("H1", fontSize=12, textColor=TEAL, spaceBefore=10, spaceAfter=5, fontName="Helvetica-Bold")
    body_s  = S("B",  fontSize=9,  textColor=GRAY, spaceAfter=3,  fontName="Helvetica", leading=13)
    bold_s  = S("Bd", fontSize=9,  textColor=black, spaceAfter=2, fontName="Helvetica-Bold")
    tiny_s  = S("Ty", fontSize=8,  textColor=GRAY, spaceAfter=2,  fontName="Helvetica")

    def hr():
        return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=5, spaceBefore=3)

    def lkr(v):
        try: return f"LKR {float(v or 0):,.2f}"
        except: return "LKR 0.00"

    def fdate(v):
        if not v: return "—"
        try:
            if isinstance(v, datetime): return v.strftime("%d %b %Y")
            return str(v)[:10]
        except: return str(v)

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=16*mm, bottomMargin=16*mm
    )
    story = []

    # ── Cover ─────────────────────────────────────────────────────────────
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("Lanka-Link", title_s))
    story.append(Paragraph("Financial Ledger Report", sub_s))
    story.append(Paragraph(
        f"Generated: {datetime.utcnow().strftime('%d %B %Y  %H:%M UTC')}  ·  "
        f"Account: {current_user.get('full_name', current_user.get('email','—'))}",
        S("D", fontSize=8, textColor=GRAY, spaceAfter=10, alignment=TA_CENTER, fontName="Helvetica")
    ))
    story.append(hr())
    story.append(Spacer(1, 3*mm))

    # ── Financial summary ─────────────────────────────────────────────────
    story.append(Paragraph("Financial Summary", h1_s))
    profit     = float(summ.get("net_profit", 0) or 0)
    profit_col = GREEN if profit >= 0 else RED
    summary_data = [
        [Paragraph("<b>Total Income</b>",  bold_s), Paragraph(lkr(summ.get("total_income")),  S("I", fontSize=10, textColor=GREEN, fontName="Helvetica-Bold"))],
        [Paragraph("<b>Total Expense</b>", bold_s), Paragraph(lkr(summ.get("total_expense")), S("E", fontSize=10, textColor=RED,   fontName="Helvetica-Bold"))],
        [Paragraph("<b>Net Profit</b>",    bold_s), Paragraph(lkr(summ.get("net_profit")),    S("P", fontSize=10, textColor=profit_col, fontName="Helvetica-Bold"))],
        [Paragraph("<b>Cash Balance</b>",  bold_s), Paragraph(lkr(summ.get("cash_balance")),  S("C", fontSize=10, textColor=TEAL,  fontName="Helvetica-Bold"))],
        [Paragraph("<b>Total Records</b>", bold_s), Paragraph(str(summ.get("transaction_count", len(entries))), body_s)],
    ]
    t = Table(summary_data, colWidths=[55*mm, 55*mm])
    t.setStyle(TableStyle([
        ("BOX",           (0,0),(-1,-1), 0.5, BORDER),
        ("INNERGRID",     (0,0),(-1,-1), 0.3, BORDER),
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [white, GRAY_L]),
    ]))
    story.append(t)
    story.append(Spacer(1, 4*mm))

    # ── Payment method split ──────────────────────────────────────────────
    if p_split:
        story.append(Paragraph("Payment Method Breakdown", h1_s))
        ps = [[Paragraph("<b>Method</b>", bold_s), Paragraph("<b>Total</b>", bold_s)]]
        for method, amount in p_split.items():
            ps.append([
                Paragraph(str(method).replace("_"," ").title(), body_s),
                Paragraph(lkr(amount), body_s),
            ])
        pt = Table(ps, colWidths=[70*mm, 55*mm])
        pt.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,0),  TEAL),
            ("TEXTCOLOR",     (0,0),(-1,0),  white),
            ("BOX",           (0,0),(-1,-1), 0.5, TEAL),
            ("INNERGRID",     (0,0),(-1,-1), 0.3, BORDER),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [white, TEAL_L]),
        ]))
        story.append(pt)
        story.append(Spacer(1, 4*mm))

    # ── Monthly breakdown ─────────────────────────────────────────────────
    monthly = rep.get("monthly", [])
    if monthly:
        story.append(Paragraph("Monthly Breakdown", h1_s))
        mo = [[
            Paragraph("<b>Month</b>",   bold_s),
            Paragraph("<b>Income</b>",  bold_s),
            Paragraph("<b>Expense</b>", bold_s),
            Paragraph("<b>Net</b>",     bold_s),
        ]]
        for m in monthly:
            net = float(m.get("income",0)) - float(m.get("expense",0))
            mo.append([
                Paragraph(str(m.get("month","—")), body_s),
                Paragraph(lkr(m.get("income")),    body_s),
                Paragraph(lkr(m.get("expense")),   body_s),
                Paragraph(lkr(net), S("N", fontSize=9, textColor=GREEN if net>=0 else RED, fontName="Helvetica-Bold")),
            ])
        mot = Table(mo, colWidths=[35*mm, 42*mm, 42*mm, 42*mm])
        mot.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,0),  TEAL),
            ("TEXTCOLOR",     (0,0),(-1,0),  white),
            ("BOX",           (0,0),(-1,-1), 0.5, TEAL),
            ("INNERGRID",     (0,0),(-1,-1), 0.3, BORDER),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [white, TEAL_L]),
        ]))
        story.append(mot)
        story.append(Spacer(1, 4*mm))

    # ── All ledger entries ────────────────────────────────────────────────
    story.append(Paragraph(f"Ledger Entries ({len(entries)} records)", h1_s))
    if not entries:
        story.append(Paragraph("No ledger entries found.", body_s))
    else:
        rows = [[
            Paragraph("<b>Date</b>",    bold_s),
            Paragraph("<b>Title</b>",   bold_s),
            Paragraph("<b>Type</b>",    bold_s),
            Paragraph("<b>Category</b>",bold_s),
            Paragraph("<b>Amount</b>",  bold_s),
            Paragraph("<b>Payment</b>", bold_s),
        ]]
        for e in entries:
            is_income = e.get("entry_type") == "income"
            rows.append([
                Paragraph(fdate(e.get("created_at")), tiny_s),
                Paragraph(str(e.get("title", e.get("description","—")))[:28], tiny_s),
                Paragraph(str(e.get("entry_type","—")).title(), tiny_s),
                Paragraph(str(e.get("category","—")).replace("_"," ").title(), tiny_s),
                Paragraph(
                    f"{'+'if is_income else'-'}{lkr(e.get('amount'))}",
                    S("A", fontSize=8, textColor=GREEN if is_income else RED, fontName="Helvetica-Bold")
                ),
                Paragraph(str(e.get("payment_method","—")).replace("_"," ").title(), tiny_s),
            ])
        et = Table(rows, colWidths=[22*mm, 44*mm, 20*mm, 28*mm, 34*mm, 22*mm])
        et.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,0),  TEAL),
            ("TEXTCOLOR",     (0,0),(-1,0),  white),
            ("BOX",           (0,0),(-1,-1), 0.5, BORDER),
            ("INNERGRID",     (0,0),(-1,-1), 0.3, BORDER),
            ("TOPPADDING",    (0,0),(-1,-1), 4),
            ("BOTTOMPADDING", (0,0),(-1,-1), 4),
            ("LEFTPADDING",   (0,0),(-1,-1), 5),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [white, GRAY_L]),
        ]))
        story.append(et)

    doc.build(story)
    buf.seek(0)

    fname = f"lanka_link_ledger_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={fname}",
            "Content-Type": "application/pdf",
        }
    )


# ── Dynamic routes AFTER all static routes ───────────────────────────────────

@router.get("/{item_id}")
async def get_entry(item_id: str, current_user: dict = Depends(get_current_user)):
    return await LedgerService().get_by_id(item_id)


@router.post("")
async def create_entry(data: dict, current_user: dict = Depends(get_current_user)):
    return await LedgerService().create(data)


@router.put("/{item_id}")
async def update_entry(item_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    return await LedgerService().update(item_id, data)


@router.delete("/{item_id}")
async def delete_entry(item_id: str, current_user: dict = Depends(get_current_user)):
    return await LedgerService().delete(item_id)
