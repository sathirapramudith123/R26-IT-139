from datetime import datetime
from fastapi import HTTPException, status

from app.models.procurement_model import ProcurementDecision
from app.repositories.procurement_repository import ProcurementRepository
from app.repositories.supplier_repository import SupplierRepository


class ProcurementService:
    def __init__(self):
        self.repository = ProcurementRepository()
        self.supplier_repository = SupplierRepository()

    def normalize_datetime(self, value):
        if not value:
            return None

        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))

        if value.tzinfo is not None:
            value = value.replace(tzinfo=None)

        return value

    def normalize_score(self, value: float, min_value: float, max_value: float, reverse=False):
        if max_value == min_value:
            return 100

        score = ((value - min_value) / (max_value - min_value)) * 100

        if reverse:
            score = 100 - score

        return round(score, 2)

    async def recommend_suppliers(self, request_data: dict):
        suppliers = await self.supplier_repository.list_all()

        quantity = float(request_data["quantity"])
        expected_selling_price = float(request_data["expected_selling_price"])
        required_delivery_date = self.normalize_datetime(
            request_data["required_delivery_date"]
        )

        valid_offers = []

        for supplier in suppliers:
            if supplier.get("status") != "active":
                continue

            unit_price = float(supplier.get("unit_price", 0) or 0)
            delivery_cost = float(supplier.get("delivery_cost", 0) or 0)
            available_quantity = float(supplier.get("available_quantity", 0) or 0)

            if unit_price <= 0:
                continue

            if available_quantity < quantity:
                continue

            estimated_delivery_date = self.normalize_datetime(
                supplier.get("estimated_delivery_date")
            )

            if not estimated_delivery_date:
                estimated_delivery_date = required_delivery_date

            if estimated_delivery_date > required_delivery_date:
                continue

            item_cost = unit_price * quantity
            total_cost = item_cost + delivery_cost
            revenue = expected_selling_price * quantity
            estimated_profit = revenue - total_cost

            valid_offers.append({
                "supplier_id": supplier["id"],
                "supplier_name": supplier["name"],
                "unit_price": unit_price,
                "delivery_cost": delivery_cost,
                "available_quantity": available_quantity,
                "estimated_delivery_date": estimated_delivery_date,
                "item_cost": item_cost,
                "total_cost": total_cost,
                "revenue": revenue,
                "estimated_profit": estimated_profit,
                "reliability_score": float(supplier.get("reliability_score", 0) or 0),
                "delivery_score": float(supplier.get("delivery_score", 0) or 0),
            })

        if not valid_offers:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No suitable suppliers found",
            )

        min_cost = min(item["total_cost"] for item in valid_offers)
        max_cost = max(item["total_cost"] for item in valid_offers)

        min_profit = min(item["estimated_profit"] for item in valid_offers)
        max_profit = max(item["estimated_profit"] for item in valid_offers)

        results = []

        for offer in valid_offers:
            cost_score = self.normalize_score(
                offer["total_cost"],
                min_cost,
                max_cost,
                reverse=True,
            )

            profit_score = self.normalize_score(
                offer["estimated_profit"],
                min_profit,
                max_profit,
            )

            final_score = (
                cost_score * 0.40 +
                profit_score * 0.30 +
                offer["reliability_score"] * 0.20 +
                offer["delivery_score"] * 0.10
            )

            results.append({
                **offer,
                "cost_score": cost_score,
                "profit_score": profit_score,
                "final_score": round(final_score, 2),
                "reason": "Best supplier based on cost, profit, reliability, and delivery.",
            })

        results.sort(key=lambda x: x["final_score"], reverse=True)

        top_10 = results[:10]

        for index, item in enumerate(top_10, start=1):
            item["rank"] = index

        return top_10

    async def create(self, data: dict):
        payload = ProcurementDecision(**data).model_dump()
        return await self.repository.create(payload)

    async def list_all(self):
        await self.repository.patch_missing_fields()
        return await self.repository.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repository.get_by_id(item_id)

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Procurement decision not found",
            )

        return item

    async def update(self, item_id: str, data: dict):
        existing = await self.repository.get_by_id(item_id)

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Procurement decision not found",
            )

        updated = {**existing, **data}
        return await self.repository.update(item_id, updated)

    async def delete(self, item_id: str):
        existing = await self.repository.get_by_id(item_id)

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Procurement decision not found",
            )

        deleted = await self.repository.delete(item_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete procurement decision",
            )

        return {"message": "Procurement decision deleted successfully"}