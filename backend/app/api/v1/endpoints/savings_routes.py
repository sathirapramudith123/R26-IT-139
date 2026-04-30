from fastapi import APIRouter
from app.schemas.savings_schema import SavingsRecordCreate
from app.services.savings_service import SavingsRecordService

router = APIRouter(prefix="/savings", tags=["savings"])


@router.get("")
async def list_items():
    service = SavingsRecordService()
    return await service.list_all()


@router.get("/{item_id}")
async def get_item(item_id: str):
    service = SavingsRecordService()
    return await service.get_by_id(item_id)


@router.post("")
async def create_item(payload: SavingsRecordCreate):
    service = SavingsRecordService()
    return await service.create(payload.model_dump())