"""
ProcurementService v2 — Market-Benchmarked Rule-Based DSS
==========================================================

Enhancement: price_score now uses the HKARTI government wholesale price
as a benchmark instead of just comparing suppliers against each other.

If market price data is available:
  - Supplier quoting BELOW market average → price_score boosted
  - Supplier quoting ABOVE market average → price_score reduced
  - Score includes "vs_market_pct" field showing % above/below market

If no market data available → falls back to relative comparison (original behaviour).
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException

from app.repositories.supplier_repository import SupplierRepository
from app.repositories.procurement_repository import ProcurementRepository
from app.repositories.price_data_repository import PriceDataRepository


def _to_date(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def _normalize(value: float, min_val: float, max_val: float, reverse: bool = False) -> float:
    if max_val == min_val:
        return 50.0
    score = (value - min_val) / (max_val - min_val) * 100
    return round(100 - score if reverse else score, 2)


def _price_score_vs_market(supplier_price: float, market_avg: float) -> tuple[float, float]:
    """
    Calculate price score relative to the government market average.

    Score logic:
    - At market average     → 50
    - 20% below market avg  → 100 (excellent deal)
    - 20% above market avg  → 0   (overpriced)

    Returns (price_score, vs_market_pct)
    vs_market_pct: negative = below market (good), positive = above market (bad)
    """
    if market_avg <= 0:
        return 50.0, 0.0
    vs_market_pct = round(((supplier_price - market_avg) / market_avg) * 100, 1)
    # Map -20% to +20% range to 100 → 0 score
    score = max(0.0, min(100.0, 50.0 - (vs_market_pct * 2.5)))
    return round(score, 2), vs_market_pct


class ProcurementService:
    def __init__(self, repo=None, supplier_repo=None, price_repo=None):
        self.repo         = repo          or ProcurementRepository()
        self.supplier_repo = supplier_repo or SupplierRepository()
        self.price_repo   = price_repo    or PriceDataRepository()

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def list_all(self):
        return await self.repo.list_all()

    async def get_by_id(self, item_id: str):
        item = await self.repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Procurement record not found")
        return item

    async def create(self, data: dict):
        return await self.repo.create(data)

    async def update(self, item_id: str, data: dict):
        existing = await self.repo.get_by_id(item_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Procurement record not found")
        return await self.repo.update(item_id, data)

    async def delete(self, item_id: str):
        deleted = await self.repo.delete(item_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Delete failed")
        return {"message": "Procurement record deleted"}

    # ── Reliability score ─────────────────────────────────────────────────────

    async def _calculate_reliability(self, supplier_id: str) -> float:
        all_decisions = await self.repo.list_all()
        supplier_decisions = [
            d for d in all_decisions
            if d.get("selected_supplier_id") == supplier_id
        ]
        if not supplier_decisions:
            return 70.0
        score = 70.0
        for d in supplier_decisions:
            if d.get("status") == "completed":
                score += 10
            elif d.get("status") == "cancelled":
                score -= 15
        return round(max(0.0, min(100.0, score)), 2)

    # ── Score calculation ─────────────────────────────────────────────────────

    async def _calculate_scores_for_all(
        self,
        suppliers: list[dict],
        required_delivery_date: datetime,
        quantity: float,
        market_avg_price: Optional[float] = None,
    ) -> list[dict]:
        now = datetime.now(timezone.utc)
        eligible = []

        for s in suppliers:
            if s.get("status") != "active":
                continue
            if not s.get("unit_price") or float(s.get("unit_price", 0)) <= 0:
                continue
            if float(s.get("available_quantity", 0)) < quantity:
                continue
            est_date = _to_date(s.get("estimated_delivery_date"))
            if est_date and est_date.replace(tzinfo=timezone.utc) > required_delivery_date:
                continue
            eligible.append(s)

        if not eligible:
            return []

        # Delivery score — relative
        def days_to_deliver(s):
            d = _to_date(s.get("estimated_delivery_date"))
            if not d:
                return 999
            return max(0, (d.replace(tzinfo=timezone.utc) - now).days)

        delivery_days = [days_to_deliver(s) for s in eligible]
        min_d, max_d  = min(delivery_days), max(delivery_days)

        enriched = []
        for s, days in zip(eligible, delivery_days):
            price         = float(s["unit_price"])
            delivery_cost = float(s.get("delivery_cost", 0))
            total_cost    = (price * quantity) + delivery_cost

            # Price score — use market benchmark if available, else relative
            if market_avg_price and market_avg_price > 0:
                price_score, vs_market_pct = _price_score_vs_market(price, market_avg_price)
            else:
                prices = [float(x["unit_price"]) for x in eligible]
                price_score    = _normalize(price, min(prices), max(prices), reverse=True)
                vs_market_pct  = None

            delivery_score = _normalize(days, min_d, max_d, reverse=True)
            reliability    = await self._calculate_reliability(s["id"])

            enriched.append({
                **s,
                "price_score":       price_score,
                "delivery_score":    delivery_score,
                "reliability_score": reliability,
                "total_cost":        round(total_cost, 2),
                "days_to_deliver":   days,
                "market_avg_price":  market_avg_price,
                "vs_market_pct":     vs_market_pct,
            })

        return enriched

    # ── Recommendation engine ─────────────────────────────────────────────────

    async def recommend_suppliers(self, request_data: dict) -> list[dict]:
        """
        Main DSS entry point.

        Weights: Cost 40% · Profit 30% · Reliability 20% · Delivery 10%

        Price score uses HKARTI government market average as benchmark when available.
        Falls back to relative comparison if no market data exists.
        """
        quantity               = float(request_data.get("quantity", 1))
        expected_selling_price = float(request_data.get("expected_selling_price", 0))
        item_name              = request_data.get("item_name", "")
        raw_date               = request_data.get("required_delivery_date")
        required_date          = _to_date(raw_date)

        if not required_date:
            raise HTTPException(status_code=400, detail="Invalid required_delivery_date")
        if required_date.tzinfo is None:
            required_date = required_date.replace(tzinfo=timezone.utc)

        # Fetch market price from HKARTI data
        market_avg_price = await self.price_repo.get_avg_price_latest(item_name)
        market_data_used = market_avg_price is not None

        all_suppliers = await self.supplier_repo.list_all()
        if not all_suppliers:
            return []

        candidates = await self._calculate_scores_for_all(
            all_suppliers, required_date, quantity, market_avg_price
        )
        if not candidates:
            return []

        # Profit score
        for c in candidates:
            revenue = expected_selling_price * quantity
            c["estimated_profit"] = round(revenue - c["total_cost"], 2)

        profits = [c["estimated_profit"] for c in candidates]
        min_pr, max_pr = min(profits), max(profits)

        results = []
        for c in candidates:
            profit_score = _normalize(c["estimated_profit"], min_pr, max_pr)

            final_score = round(
                (c["price_score"]       * 0.40) +
                (profit_score           * 0.30) +
                (c["reliability_score"] * 0.20) +
                (c["delivery_score"]    * 0.10),
                2,
            )

            # Market comparison text for display
            if c["vs_market_pct"] is not None:
                pct = c["vs_market_pct"]
                if pct < 0:
                    market_comparison = f"{abs(pct):.1f}% below market average (good deal)"
                elif pct > 0:
                    market_comparison = f"{pct:.1f}% above market average"
                else:
                    market_comparison = "At market average"
            else:
                market_comparison = "No market data available"

            results.append({
                "supplier_id":        c["id"],
                "supplier_name":      c.get("name", ""),
                "unit_price":         float(c["unit_price"]),
                "delivery_cost":      float(c.get("delivery_cost", 0)),
                "total_cost":         c["total_cost"],
                "estimated_profit":   c["estimated_profit"],
                "days_to_deliver":    c["days_to_deliver"],
                "price_score":        c["price_score"],
                "profit_score":       round(profit_score, 2),
                "reliability_score":  c["reliability_score"],
                "delivery_score":     c["delivery_score"],
                "final_score":        final_score,
                "market_avg_price":   market_avg_price,
                "vs_market_pct":      c["vs_market_pct"],
                "market_comparison":  market_comparison,
                "score_breakdown": {
                    "cost_weight":          "40%",
                    "profit_weight":        "30%",
                    "reliability_weight":   "20%",
                    "delivery_weight":      "10%",
                    "price_basis":          "HKARTI government market average" if market_data_used else "Relative to other suppliers",
                    "market_data_used":     market_data_used,
                    "market_avg_price":     market_avg_price,
                    "reliability_basis":    "Past order history (new suppliers default 70)",
                    "delivery_basis":       "Days until estimated delivery date",
                },
            })

        results.sort(key=lambda x: x["final_score"], reverse=True)
        for i, r in enumerate(results):
            r["rank"] = i + 1

        return results
