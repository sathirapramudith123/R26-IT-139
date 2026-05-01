from fastapi import APIRouter

from app.services.procurement_service import ProcurementService
from app.schemas.procurement_schema import ProcurementCreate, ProcurementResponse

router = APIRouter(prefix="/procurement", tags=["procurement"])


@router.get("/recommendations")
async def get_recommendations():
    service = ProcurementService()
    return await service.generate_recommendations()


@router.get("", response_model=list[ProcurementResponse])
async def list_items():
    service = ProcurementService()
    return await service.list_all()


@router.get("/{item_id}", response_model=ProcurementResponse)
async def get_item(item_id: str):
    service = ProcurementService()
    return await service.get_by_id(item_id)


@router.post("", response_model=ProcurementResponse)
async def create_item(payload: ProcurementCreate):
    service = ProcurementService()
    return await service.create(payload.model_dump())


@router.put("/{item_id}", response_model=ProcurementResponse)
async def update_item(item_id: str, payload: ProcurementCreate):
    service = ProcurementService()
    return await service.update(item_id, payload.model_dump())


@router.delete("/{item_id}")
async def delete_item(item_id: str):
    service = ProcurementService()
    return await service.delete(item_id)