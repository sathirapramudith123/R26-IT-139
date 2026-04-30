from fastapi import HTTPException, status

from app.models.supplier_model import Supplier
from app.repositories.supplier_repository import SupplierRepository


class SupplierService:
    def __init__(self):
        self.repository = SupplierRepository()

    def calculate_total_score(self, data: dict):
        price_score = data.get("price_score", 0)
        reliability_score = data.get("reliability_score", 0)
        delivery_score = data.get("delivery_score", 0)

        return round(
            (price_score + reliability_score + delivery_score) / 3,
            2
        )

    async def create(self, data: dict):
        existing = await self.repository.get_by_name(data["name"])

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Supplier already exists"
            )

        data["total_score"] = self.calculate_total_score(data)

        payload = Supplier(**data).model_dump()
        return await self.repository.create(payload)

    async def list_all(self):
        await self.repository.patch_missing_fields()
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )

        return item

    async def update(self, item_id: str, data: dict):
        existing = await self.repository.get_by_id(item_id)

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )

        merged_data = {
            **existing,
            **data
        }

        merged_data["total_score"] = self.calculate_total_score(merged_data)

        item = await self.repository.update(item_id, merged_data)

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )

        return item

    async def delete(self, item_id: str):
        existing = await self.repository.get_by_id(item_id)

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )

        deleted = await self.repository.delete(item_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete supplier"
            )

        return {"message": "Supplier deleted successfully"}