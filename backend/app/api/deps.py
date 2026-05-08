from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.security import decode_access_token

from app.repositories.transaction_repository import TransactionRepository
from app.repositories.journal_repository import JournalEntryRepository
from app.repositories.inventory_repository import InventoryItemRepository
from app.repositories.supplier_repository import SupplierRepository

from app.services.journal_service import JournalService
from app.services.transaction_service import TransactionService
from app.services.inventory_service import InventoryItemService
from app.services.supplier_service import SupplierService

security = HTTPBearer()
VALID_ROLES = {"merchant", "bank_agent", "admin"}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    token   = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id      = payload.get("sub") or payload.get("user_id", "")
    session_role = payload.get("role", "merchant")

    # JWT actual_role is set at login from real DB — always trustworthy
    jwt_actual_role = payload.get("actual_role", session_role)
    if jwt_actual_role not in VALID_ROLES:
        jwt_actual_role = "merchant"

    # Try fresh DB lookup to catch role upgrades made after last login
    try:
        user = await db["users"].find_one({"id": user_id})
        if not user:
            user = await db["users"].find_one({"_id": user_id})

        if user:
            db_role = user.get("role") or ""
            # Use DB role if valid, else trust JWT actual_role
            actual_role = db_role if db_role in VALID_ROLES else jwt_actual_role
            return {
                "id":          user.get("id") or str(user.get("_id", user_id)),
                "email":       user.get("email", payload.get("email", "")),
                "full_name":   user.get("full_name", payload.get("full_name", "")),
                "role":        session_role,
                "actual_role": actual_role,
            }
    except Exception:
        pass  # DB lookup failed — fall through to JWT fallback

    # Fallback to JWT — actual_role was set correctly at login time
    return {
        "id":          user_id,
        "email":       payload.get("email", ""),
        "full_name":   payload.get("full_name", ""),
        "role":        session_role,
        "actual_role": jwt_actual_role,
    }


def require_role(*allowed_roles: str):
    async def _guard(current_user: dict = Depends(get_current_user)) -> dict:
        role = current_user.get("role", "merchant")
        if role == "admin":
            return current_user
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required: {' or '.join(allowed_roles)}. Your role: {role}.",
            )
        return current_user
    return _guard


require_admin      = require_role("admin")
require_bank_agent = require_role("bank_agent", "admin")
require_merchant   = require_role("merchant", "bank_agent", "admin")


async def get_transaction_service(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> TransactionService:
    txn_repo     = TransactionRepository(db)
    journal_repo = JournalEntryRepository()
    journal_svc  = JournalService(journal_repo)
    return TransactionService(txn_repo, journal_svc)


async def get_inventory_service() -> InventoryItemService:
    return InventoryItemService(InventoryItemRepository())


async def get_supplier_service() -> SupplierService:
    return SupplierService(SupplierRepository())


async def get_agency_banking_service():
    from app.repositories.agency_banking_repository import AgencyBankingRepository
    from app.services.agency_banking_service import AgencyBankingService
    return AgencyBankingService(AgencyBankingRepository())


async def get_procurement_service():
    from app.repositories.procurement_repository import ProcurementRepository
    from app.services.procurement_service import ProcurementService
    return ProcurementService(ProcurementRepository(), SupplierRepository())