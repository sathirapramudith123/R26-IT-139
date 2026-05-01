from fastapi import APIRouter
from app.schemas.transaction_schema import TransactionCreate
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.get("")
async def list_items():
    return await TransactionService().list_all()

@router.get("/{item_id}")
async def get_item(item_id: str):
    return await TransactionService().get_by_id(item_id)

@router.post("")
async def create_item(payload: TransactionCreate):
    return await TransactionService().create(payload.model_dump())

@router.get("/history")
async def history():
    return await TransactionService().get_history()