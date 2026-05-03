from fastapi import APIRouter
from app.schemas.smart_agent_schema import SmartAgentInsightCreate
from app.services.smart_agent_service import SmartAgentInsightService

router = APIRouter(prefix="/smart-agent", tags=["smart-agent"])


@router.get("")
async def list_items():
    service = SmartAgentInsightService()
    return await service.list_all()


@router.get("/{item_id}")
async def get_item(item_id: str):
    service = SmartAgentInsightService()
    return await service.get_by_id(item_id)


@router.post("")
async def create_item(payload: SmartAgentInsightCreate):
    service = SmartAgentInsightService()
    return await service.create(payload.model_dump())