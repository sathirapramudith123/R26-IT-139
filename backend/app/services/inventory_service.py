from fastapi import HTTPException, status

from app.models.inventory_model import InventoryItem
from app.repositories.inventory_repository import InventoryItemRepository
from app.repositories.supplier_repository import SupplierRepository


class InventoryItemService:
    def __init__(self):
        self.repository = InventoryItemRepository()
        self.supplier_repository = SupplierRepository()

    def get_stock_status(self, quantity: float, reorder_level: float):
        if quantity <= reorder_level:
            return "low_stock"
        return "available"

    async def validate_supplier(self, supplier_id: str):
        supplier = await self.supplier_repository.get_by_id(supplier_id)

        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected supplier does not exist"
            )

        return supplier

    async def create(self, data: dict):
        existing_item = await self.repository.get_by_name(data["name"])

        if existing_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inventory item already exists"
            )

        supplier = await self.validate_supplier(data["supplier_id"])

        data["supplier_name"] = supplier["name"]
        data["status"] = self.get_stock_status(
            data["quantity"],
            data["reorder_level"]
        )

        payload = InventoryItem(**data).model_dump()
        return await self.repository.create(payload)

    async def list_all(self):
        await self.repository.patch_missing_fields()
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )

        return item

    async def update(self, item_id: str, data: dict):
        existing_item = await self.repository.get_by_id(item_id)

        if not existing_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )

        supplier = await self.validate_supplier(data["supplier_id"])

        data["supplier_name"] = supplier["name"]
        data["status"] = self.get_stock_status(
            data["quantity"],
            data["reorder_level"]
        )

        updated_item = {
            **existing_item,
            **data
        }

        item = await self.repository.update(item_id, updated_item)

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )

        return item

    async def delete(self, item_id: str):
        existing_item = await self.repository.get_by_id(item_id)

        if not existing_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )

        deleted = await self.repository.delete(item_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete inventory item"
            )

        return {"message": "Inventory item deleted successfully"}