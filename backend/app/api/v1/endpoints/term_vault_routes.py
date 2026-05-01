from fastapi import APIRouter
from app.schemas.term_vault_schema import TermVaultCreate
from app.services.term_vault_service import TermVaultService

router = APIRouter(prefix="/term-vault", tags=["term-vault"])


@router.get("")
async def list_items():
    service = TermVaultService()
    return await service.list_all()


@router.get("/{item_id}")
async def get_item(item_id: str):
    service = TermVaultService()
    return await service.get_by_id(item_id)


@router.post("")
async def create_item(payload: TermVaultCreate):
    service = TermVaultService()
    return await service.create(payload.model_dump())