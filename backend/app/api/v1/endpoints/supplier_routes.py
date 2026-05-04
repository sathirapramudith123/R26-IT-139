from fastapi import APIRouter, status

from app.schemas.supplier_schema import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    SupplierDeleteResponse,
)
from app.services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=list[SupplierResponse])
async def list_items():
    service = SupplierService()
    return await service.list_all()


@router.get("/{item_id}", response_model=SupplierResponse)
async def get_item(item_id: str):
    service = SupplierService()
    return await service.get_by_id(item_id)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_item(payload: SupplierCreate):
    service = SupplierService()
    return await service.create(payload.model_dump())


@router.put("/{item_id}", response_model=SupplierResponse)
async def update_item(item_id: str, payload: SupplierUpdate):
    service = SupplierService()
    return await service.update(item_id, payload.model_dump())


@router.delete("/{item_id}", response_model=SupplierDeleteResponse)
async def delete_item(item_id: str):
    service = SupplierService()
    return await service.delete(item_id)