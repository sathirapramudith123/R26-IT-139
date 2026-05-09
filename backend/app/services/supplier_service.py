from fastapi import HTTPException, status
from app.models.supplier_model import Supplier
from app.repositories.supplier_repository import SupplierRepository


class SupplierService:
    def __init__(self):
        self.repository = SupplierRepository()

    def calculate_total_score(self, data: dict) -> float:
        p = float(data.get("price_score", 0) or 0)
        r = float(data.get("reliability_score", 0) or 0)
        d = float(data.get("delivery_score", 0) or 0)
        return round((p + r + d) / 3, 2)

    async def create(self, data: dict):
        if await self.repository.get_by_name(data["name"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Supplier already exists")
        data["total_score"] = self.calculate_total_score(data)
        return await self.repository.create(Supplier(**data).model_dump())

    async def list_all(self):
        await self.repository.patch_missing_fields()
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
        return item

    async def update(self, item_id: str, data: dict):
        existing = await self.repository.get_by_id(item_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
        merged = {**existing, **data}
        merged["total_score"] = self.calculate_total_score(merged)
        item = await self.repository.update(item_id, merged)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
        return item

    async def delete(self, item_id: str):
        if not await self.repository.get_by_id(item_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
        if not await self.repository.delete(item_id):
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete supplier")
        return {"message": "Supplier deleted successfully"}
