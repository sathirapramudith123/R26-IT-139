from fastapi import APIRouter, status, Depends

from app.schemas.agency_banking_schema import (
    AgencyBankingCreate,
    AgencyBankingUpdate,
    AgencyBankingResponse,
    AgencyBankingDeleteResponse,
    AgencyBankingSummaryResponse,
)
from app.services.agency_banking_service import AgencyBankingService
from app.api.deps import get_current_user, require_bank_agent

router = APIRouter(prefix="/agency-banking", tags=["agency-banking"])

# ── All agency banking routes require bank_agent or admin role ────────────────
# This enforces the research requirement:
#   "merchants are already onboarded through the bank's agent registration process"
# A plain merchant cannot access these endpoints until an admin upgrades
# their role to bank_agent via PUT /auth/users/{id}/role


@router.get("/summary", response_model=AgencyBankingSummaryResponse)
async def get_summary(
    current_user: dict = Depends(require_bank_agent),
):
    return await AgencyBankingService().get_summary()


@router.get("", response_model=list[AgencyBankingResponse])
async def list_items(
    current_user: dict = Depends(require_bank_agent),
):
    return await AgencyBankingService().list_all()


@router.get("/{item_id}", response_model=AgencyBankingResponse)
async def get_item(
    item_id: str,
    current_user: dict = Depends(require_bank_agent),
):
    return await AgencyBankingService().get_by_id(item_id)


@router.post(
    "",
    response_model=AgencyBankingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_item(
    payload: AgencyBankingCreate,
    current_user: dict = Depends(require_bank_agent),
):
    return await AgencyBankingService().create(payload.model_dump())


@router.put("/{item_id}", response_model=AgencyBankingResponse)
async def update_item(
    item_id: str,
    payload: AgencyBankingUpdate,
    current_user: dict = Depends(require_bank_agent),
):
    return await AgencyBankingService().update(item_id, payload.model_dump())


@router.delete("/{item_id}", response_model=AgencyBankingDeleteResponse)
async def delete_item(
    item_id: str,
    current_user: dict = Depends(require_bank_agent),
):
    return await AgencyBankingService().delete(item_id)
