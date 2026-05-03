from fastapi import APIRouter, status

from app.schemas.agency_banking_schema import (
    AgencyBankingCreate,
    AgencyBankingUpdate,
    AgencyBankingResponse,
    AgencyBankingDeleteResponse,
    AgencyBankingSummaryResponse,
)
from app.services.agency_banking_service import AgencyBankingService

router = APIRouter(prefix="/agency-banking", tags=["agency-banking"])


@router.get("/summary", response_model=AgencyBankingSummaryResponse)
async def get_summary():
    return await AgencyBankingService().get_summary()


@router.get("", response_model=list[AgencyBankingResponse])
async def list_items():
    return await AgencyBankingService().list_all()


@router.get("/{item_id}", response_model=AgencyBankingResponse)
async def get_item(item_id: str):
    return await AgencyBankingService().get_by_id(item_id)


@router.post(
    "",
    response_model=AgencyBankingResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_item(payload: AgencyBankingCreate):
    return await AgencyBankingService().create(payload.model_dump())


@router.put("/{item_id}", response_model=AgencyBankingResponse)
async def update_item(item_id: str, payload: AgencyBankingUpdate):
    return await AgencyBankingService().update(item_id, payload.model_dump())


@router.delete("/{item_id}", response_model=AgencyBankingDeleteResponse)
async def delete_item(item_id: str):
    return await AgencyBankingService().delete(item_id)