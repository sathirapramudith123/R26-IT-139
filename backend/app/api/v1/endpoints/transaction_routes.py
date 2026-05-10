from fastapi import APIRouter

from app.schemas.transaction_schema import TransactionCreate, TransactionResponse
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionResponse])
async def list_items():
    return await TransactionService().list_all()


@router.get("/history", response_model=list[TransactionResponse])
async def get_history():
    return await TransactionService().get_history()


@router.get("/{item_id}", response_model=TransactionResponse)
async def get_item(item_id: str):
    return await TransactionService().get_by_id(item_id)


@router.post("", response_model=TransactionResponse)
async def create_item(payload: TransactionCreate):
    return await TransactionService().create(payload.model_dump())