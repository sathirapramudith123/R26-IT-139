from fastapi import HTTPException, status

from app.models.inventory_model import InventoryItem
from app.repositories.inventory_repository import InventoryItemRepository
from app.repositories.supplier_repository import SupplierRepository
from app.services.notification_service import NotificationService


class InventoryItemService:
    def __init__(self):
        self.repository           = InventoryItemRepository()
        self.supplier_repository  = SupplierRepository()
        self.notification_service = NotificationService()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def get_stock_status(self, quantity: float, reorder_level: float) -> str:
        if quantity <= reorder_level:
            return "low_stock"
        return "available"

    async def validate_supplier(self, supplier_id: str) -> dict:
        supplier = await self.supplier_repository.get_by_id(supplier_id)
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected supplier does not exist",
            )
        return supplier

    async def _maybe_notify_low_stock(self, item: dict):
        """
        Create a low-stock notification when an item's quantity is at or
        below its reorder level.  Silently suppressed if notification
        creation fails so it never blocks the inventory operation.
        """
        if item.get("status") == "low_stock":
            try:
                await self.notification_service.create({
                    "title":         f"Low stock: {item['name']}",
                    "message":       (
                        f"{item['name']} has only {item['quantity']} {item.get('unit', 'units')} "
                        f"remaining (reorder level: {item['reorder_level']})."
                    ),
                    "type":          "low_stock",
                    "priority":      "high",
                    "source_module": "inventory",
                    "source_id":     item.get("id"),
                    "is_read":       False,
                    "status":        "active",
                })
            except Exception as exc:
                print(f"[Inventory] Warning: Could not create low-stock notification: {exc}")

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def create(self, data: dict) -> dict:
        existing_item = await self.repository.get_by_name(data["name"])
        if existing_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inventory item already exists",
            )

        supplier = await self.validate_supplier(data["supplier_id"])
        data["supplier_name"] = supplier["name"]
        data["status"] = self.get_stock_status(data["quantity"], data["reorder_level"])

        payload = InventoryItem(**data).model_dump()
        created = await self.repository.create(payload)
        await self._maybe_notify_low_stock(created)
        return created

    async def list_all(self) -> list[dict]:
        await self.repository.patch_missing_fields()
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str) -> dict:
        item = await self.repository.get_by_id(item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found",
            )
        return item

    async def update(self, item_id: str, data: dict) -> dict:
        existing_item = await self.repository.get_by_id(item_id)
        if not existing_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found",
            )

        supplier = await self.validate_supplier(data["supplier_id"])
        data["supplier_name"] = supplier["name"]
        data["status"] = self.get_stock_status(data["quantity"], data["reorder_level"])

        updated_item = {**existing_item, **data}
        item = await self.repository.update(item_id, updated_item)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found",
            )

        await self._maybe_notify_low_stock(item)
        return item

    async def delete(self, item_id: str) -> dict:
        existing_item = await self.repository.get_by_id(item_id)
        if not existing_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found",
            )
        deleted = await self.repository.delete(item_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete inventory item",
            )
        return {"message": "Inventory item deleted successfully"}
