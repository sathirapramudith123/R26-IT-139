from fastapi import APIRouter
from app.api.v1.endpoints.auth_routes import router as auth_router
from app.api.v1.endpoints.inventory_routes import router as inventory_router
from app.api.v1.endpoints.ledger_routes import router as ledger_router
from app.api.v1.endpoints.notification_routes import router as notification_router
from app.api.v1.endpoints.procurement_routes import router as procurement_router
from app.api.v1.endpoints.savings_routes import router as savings_router
from app.api.v1.endpoints.smart_agent_routes import router as smart_agent_router
from app.api.v1.endpoints.supplier_routes import router as supplier_router
from app.api.v1.endpoints.term_vault_routes import router as term_vault_router
from app.api.v1.endpoints.transaction_routes import router as transaction_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(inventory_router)
api_router.include_router(ledger_router)
api_router.include_router(notification_router)
api_router.include_router(procurement_router)
api_router.include_router(savings_router)
api_router.include_router(smart_agent_router)
api_router.include_router(supplier_router)
api_router.include_router(term_vault_router)
api_router.include_router(transaction_router)
