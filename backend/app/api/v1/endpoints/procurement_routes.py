from fastapi import APIRouter, status

from app.schemas.procurement_schema import (
    ProcurementRecommendationRequest,
    ProcurementDecisionCreate,
    ProcurementDecisionUpdate,
    ProcurementDecisionResponse,
    ProcurementDeleteResponse,
)
from app.services.procurement_service import ProcurementService

router = APIRouter(prefix="/procurement", tags=["procurement"])


@router.post("/recommend")
async def recommend_suppliers(payload: ProcurementRecommendationRequest):
    service = ProcurementService()
    return await service.recommend_suppliers(payload.model_dump())
    # NOTE: duplicate bare function that previously shadowed this route has been removed.


@router.get("", response_model=list[ProcurementDecisionResponse])
async def list_items():
    return await ProcurementService().list_all()


@router.get("/{item_id}", response_model=ProcurementDecisionResponse)
async def get_item(item_id: str):
    return await ProcurementService().get_by_id(item_id)


@router.post(
    "",
    response_model=ProcurementDecisionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_item(payload: ProcurementDecisionCreate):
    return await ProcurementService().create(payload.model_dump())


@router.put("/{item_id}", response_model=ProcurementDecisionResponse)
async def update_item(item_id: str, payload: ProcurementDecisionUpdate):
    return await ProcurementService().update(item_id, payload.model_dump())


@router.delete("/{item_id}", response_model=ProcurementDeleteResponse)
async def delete_item(item_id: str):
    return await ProcurementService().delete(item_id)
