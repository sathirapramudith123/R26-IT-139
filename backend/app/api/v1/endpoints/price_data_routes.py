from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
from collections import defaultdict

from app.services.price_data_service import PriceDataService
from app.repositories.price_data_repository import PriceDataRepository
from app.api.deps import get_current_user, require_admin

router = APIRouter(prefix="/price-data", tags=["price-data"])


@router.post("/upload")
async def upload_price_pdf(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")
    pdf_bytes = await file.read()
    if len(pdf_bytes) < 1000:
        raise HTTPException(status_code=400, detail="File too small.")
    service = PriceDataService()
    records, report_date = service.parse_pdf(pdf_bytes)
    if not records:
        raise HTTPException(status_code=422, detail="No price data could be extracted.")
    saved   = await service.save(records)
    preview = [
        {
            "item_name": r["item_name"], "market": r["market"],
            "category":  r["category"], "min_price": r["min_price"],
            "max_price": r["max_price"], "avg_price": r["avg_price"],
        }
        for r in records[:20]
    ]
    return {
        "message":       f"Imported {saved} price records for {report_date}.",
        "report_date":   report_date,
        "total_records": len(records),
        "saved":         saved,
        "preview":       preview,
    }


@router.get("/export/csv")
async def export_csv(current_user: dict = Depends(require_admin)):
    service = PriceDataService()
    records = await service.list_latest()
    if not records:
        raise HTTPException(status_code=404, detail="No price data. Upload a PDF first.")
    csv_bytes = service.to_csv(records)
    date_str  = records[0].get("date", "latest") if records else "latest"
    return StreamingResponse(
        BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=hkarti_prices_{date_str}.csv"},
    )


@router.get("/latest")
async def get_latest(current_user: dict = Depends(require_admin)):
    service = PriceDataService()
    records = await service.list_latest()
    return {"count": len(records), "records": records}


@router.get("/dates")
async def get_dates(current_user: dict = Depends(require_admin)):
    return await PriceDataService().get_all_dates()


@router.get("/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    """
    Analytics for all roles — merchant, bank_agent, admin.
    Returns market comparison, cheapest markets, price ranges per item.
    """
    repo    = PriceDataRepository()
    records = await repo.list_latest()

    if not records:
        return {
            "available": False,
            "message":   "No price data uploaded yet. Ask admin to upload the daily price PDF.",
        }

    report_date = records[0].get("date", "")

    by_item = defaultdict(list)
    for r in records:
        by_item[r["item_name"]].append({
            "market":    r["market"],
            "avg_price": r["avg_price"],
            "min_price": r["min_price"],
            "max_price": r["max_price"],
            "category":  r.get("category", "other"),
        })

    item_analytics = []
    for item_name, markets in by_item.items():
        prices = [m["avg_price"] for m in markets if m["avg_price"]]
        if not prices:
            continue
        cheapest  = min(markets, key=lambda x: x["avg_price"] or 9999)
        expensive = max(markets, key=lambda x: x["avg_price"] or 0)
        item_analytics.append({
            "item_name":          item_name,
            "category":           markets[0]["category"],
            "cheapest_market":    cheapest["market"],
            "cheapest_price":     cheapest["avg_price"],
            "expensive_market":   expensive["market"],
            "expensive_price":    expensive["avg_price"],
            "avg_across_markets": round(sum(prices) / len(prices), 2),
            "price_spread":       round(max(prices) - min(prices), 2),
            "market_count":       len(markets),
            "markets":            sorted(markets, key=lambda x: x["avg_price"] or 9999),
        })

    item_analytics.sort(key=lambda x: x["price_spread"], reverse=True)

    by_market = defaultdict(list)
    for r in records:
        if r["avg_price"]:
            by_market[r["market"]].append(r["avg_price"])

    market_summary = sorted([
        {
            "market":     market,
            "avg_price":  round(sum(prices) / len(prices), 2),
            "item_count": len(prices),
        }
        for market, prices in by_market.items()
    ], key=lambda x: x["avg_price"])

    return {
        "available":      True,
        "report_date":    report_date,
        "total_items":    len(item_analytics),
        "total_records":  len(records),
        "item_analytics": item_analytics[:40],
        "market_summary": market_summary,
    }