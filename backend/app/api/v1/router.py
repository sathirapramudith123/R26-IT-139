from fastapi import APIRouter

from app.api.v1.endpoints.auth_routes import router as auth_router
from app.api.v1.endpoints.inventory_routes import router as inventory_router
from app.api.v1.endpoints.supplier_routes import router as supplier_router

from app.api.v1.endpoints.dashboard_routes import router as dashboard_router
from app.api.v1.endpoints.notification_routes import router as notification_router
from app.api.v1.endpoints.journal_routes import router as journal_router
from app.api.v1.endpoints.sync_routes import router as sync_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(inventory_router)
api_router.include_router(supplier_router)
api_router.include_router(dashboard_router)
api_router.include_router(notification_router)
api_router.include_router(journal_router)
api_router.include_router(sync_router)

