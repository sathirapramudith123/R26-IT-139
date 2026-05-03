from fastapi import APIRouter
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_dashboard_summary():
    service = DashboardService()
    return await service.get_summary()