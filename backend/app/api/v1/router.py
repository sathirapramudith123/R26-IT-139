from fastapi import APIRouter

from app.api.v1.endpoints.auth_routes import router as auth_router
from app.api.v1.endpoints.inventory_routes import router as inventory_router
from app.api.v1.endpoints.supplier_routes import router as supplier_router
from app.api.v1.endpoints.procurement_routes import router as procurement_router
from app.api.v1.endpoints.ledger_routes import router as ledger_router
from app.api.v1.endpoints.transaction_routes import router as transaction_router
from app.api.v1.endpoints.agency_banking_routes import router as agency_banking_router
from app.api.v1.endpoints.dashboard_routes import router as dashboard_router
from app.api.v1.endpoints.notification_routes import router as notification_router
from app.api.v1.endpoints.journal_routes import router as journal_router
from app.api.v1.endpoints.sync_routes import router as sync_router   
from app.api.v1.endpoints.price_data_routes import router as price_data_router
from app.api.v1.endpoints.ml_routes import router as ml_router
    

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(inventory_router)
api_router.include_router(supplier_router)
api_router.include_router(procurement_router)
api_router.include_router(ledger_router)
api_router.include_router(transaction_router)
api_router.include_router(agency_banking_router)
api_router.include_router(dashboard_router)
api_router.include_router(notification_router)
api_router.include_router(journal_router)
api_router.include_router(sync_router)                                   
api_router.include_router(price_data_router)
api_router.include_router(ml_router)