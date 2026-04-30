from app.models.procurement_model import Procurement
from app.repositories.procurement_repository import ProcurementRepository
from app.repositories.inventory_repository import InventoryItemRepository
from app.repositories.supplier_repository import SupplierRepository


class ProcurementService:
    def __init__(self):
        self.repo = ProcurementRepository()
        self.inventory_repo = InventoryItemRepository()
        self.supplier_repo = SupplierRepository()

    # 🔥 CORE DSS LOGIC
    async def generate_recommendations(self):
        inventory = await self.inventory_repo.list_all()
        suppliers = await self.supplier_repo.list_all()

        active_suppliers = [s for s in suppliers if s.get("status") == "active"]

        results = []

        for item in inventory:
            quantity = item.get("quantity", 0)

            # ✅ simple rule-based reorder logic
            reorder_level = 10

            if quantity <= reorder_level:

                best_supplier = None
                best_score = -1

                for supplier in active_suppliers:
                    score = 0

                    if supplier.get("status") == "active":
                        score += 5

                    if supplier.get("contact_number"):
                        score += 2

                    if score > best_score:
                        best_score = score
                        best_supplier = supplier

                results.append({
                    "item_id": item["id"],
                    "item_name": item["name"],
                    "current_quantity": quantity,
                    "reorder_level": reorder_level,
                    "recommended_quantity": reorder_level * 2,
                    "recommended_supplier_id": best_supplier["id"] if best_supplier else None,
                    "recommended_supplier_name": best_supplier["name"] if best_supplier else "No supplier",
                    "supplier_score": best_score,
                    "decision_reason": "Low stock detected",
                    "decision_type": "auto",
                    "status": "pending"
                })

        return results

    # CRUD
    async def create(self, data: dict):
        payload = Procurement(**data).model_dump()
        return await self.repo.create(payload)

    async def list_all(self):
        return await self.repo.list_all()

    async def get_by_id(self, item_id: str):
        return await self.repo.get_by_id(item_id)

    async def update(self, item_id: str, data: dict):
        return await self.repo.update(item_id, data)

    async def delete(self, item_id: str):
        return await self.repo.delete(item_id)