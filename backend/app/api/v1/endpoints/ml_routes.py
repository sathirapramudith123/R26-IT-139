from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from io import BytesIO

from app.services.ml_service import MLService
from app.api.deps import get_current_user, require_admin

router = APIRouter(prefix="/ml", tags=["ml-analytics"])


@router.get("/analytics")
async def get_analytics(
    item: Optional[str] = Query(None, description="Filter by item name"),
    current_user: dict = Depends(get_current_user),
):
    """Full ML analytics — all 6 models."""
    return await MLService().run_full_analytics(item_filter=item)


@router.get("/predict/{item_name}")
async def predict_item(
    item_name: str,
    current_user: dict = Depends(get_current_user),
):
    """Price prediction for a single item."""
    result = await MLService().run_full_analytics(item_filter=item_name)
    preds  = result.get("price_prediction", [])
    if not preds:
        return {"available": False, "message": f"No data for '{item_name}'"}
    return {"available": True, "prediction": preds[0]}


@router.get("/export/csv")
async def export_csv(current_user: dict = Depends(require_admin)):
    """Download all price data as CSV."""
    csv_bytes = await MLService().export_csv()
    return StreamingResponse(
        BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=lankalink_price_data.csv"},
    )


@router.get("/summary")
async def get_summary(current_user: dict = Depends(get_current_user)):
    """Quick summary — date range, counts."""
    result = await MLService().run_full_analytics()
    return result.get("summary", {"available": False})