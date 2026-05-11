"""
InventoryMLService
==================
ML models for Component 2 — Inventory and Supplier Intelligence.

Models:
  1. Demand Forecasting      — Daily sales velocity per item from transaction history
  2. Stock Runout Prediction — Linear Regression predicts when stock hits zero
  3. Reorder Recommendation  — Calculates how much to order based on predicted demand
"""

import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from sklearn.linear_model import LinearRegression

from app.core.database import MongoDB


def _safe(v, decimals=2):
    if v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v))):
        return None
    return round(float(v), decimals)


class InventoryMLService:

    @property
    def _transactions(self):
        return MongoDB.get_database()["transactions"]

    @property
    def _inventory(self):
        return MongoDB.get_database()["inventory_items"]

    async def _load_sale_transactions(self) -> list[dict]:
        cursor = self._transactions.find(
            {
                "transaction_type": "sale",
                "item_name": {"$exists": True, "$ne": None, "$ne": ""},
                "quantity":  {"$exists": True, "$ne": None},
            },
            {"_id": 0, "item_name": 1, "quantity": 1, "date": 1, "user_id": 1}
        ).sort("date", 1)
        return await cursor.to_list(10000)

    async def _load_inventory_items(self) -> list[dict]:
        cursor = self._inventory.find({}, {"_id": 0})
        return await cursor.to_list(1000)

    def _compute_daily_demand(
        self, transactions: list[dict]
    ) -> dict[str, list[tuple[datetime, float]]]:
        by_item_date: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
        for t in transactions:
            item = (t.get("item_name") or "").lower().strip()
            qty  = float(t.get("quantity") or 0)
            date = t.get("date")
            if not item or qty <= 0 or not date:
                continue
            if isinstance(date, str):
                date = datetime.fromisoformat(date.replace("Z", "+00:00"))
            date_key = date.strftime("%Y-%m-%d")
            by_item_date[item][date_key] += qty
        result = {}
        for item, date_map in by_item_date.items():
            sorted_pairs = sorted(
                [(datetime.strptime(d, "%Y-%m-%d"), q) for d, q in date_map.items()],
                key=lambda x: x[0]
            )
            result[item] = sorted_pairs
        return result

    def _predict_stockout(
        self,
        item_name: str,
        current_qty: float,
        demand_series: list[tuple[datetime, float]],
    ) -> dict:
        if len(demand_series) < 3:
            avg_daily = float(np.mean([q for _, q in demand_series])) if demand_series else 0
            days_left = (current_qty / avg_daily) if avg_daily > 0 else None
            return {
                "item_name":        item_name,
                "current_qty":      _safe(current_qty),
                "avg_daily_demand": _safe(avg_daily, 3),
                "days_until_empty": _safe(days_left, 1) if days_left else None,
                "runout_date":      None,
                "confidence":       "low — fewer than 3 data points",
                "r2_score":         None,
                "data_points":      len(demand_series),
                "model":            "simple average (insufficient data for regression)",
            }

        dates    = [d for d, _ in demand_series]
        qtys     = [q for _, q in demand_series]
        day0     = dates[0]
        X        = np.array([(d - day0).days for d in dates]).reshape(-1, 1)
        y        = np.array(qtys)
        model    = LinearRegression()
        model.fit(X, y)
        r2       = _safe(model.score(X, y), 3)
        avg_daily = _safe(float(np.mean(y)), 3)

        if avg_daily and avg_daily > 0:
            days_left   = current_qty / avg_daily
            runout_date = (datetime.now(timezone.utc) + timedelta(days=days_left)).strftime("%Y-%m-%d")
        else:
            days_left   = None
            runout_date = None

        if r2 is not None and r2 >= 0.6 and len(demand_series) >= 14:
            confidence = "high"
        elif len(demand_series) >= 7:
            confidence = "moderate"
        else:
            confidence = "low"

        return {
            "item_name":        item_name.title(),
            "current_qty":      _safe(current_qty),
            "avg_daily_demand": avg_daily,
            "days_until_empty": _safe(days_left, 1) if days_left else None,
            "runout_date":      runout_date,
            "confidence":       confidence,
            "r2_score":         r2,
            "data_points":      len(demand_series),
            "model":            "Linear Regression (scikit-learn)",
        }

    def _reorder_recommendation(
        self,
        prediction: dict,
        reorder_level: float,
        unit: str = "units",
        cover_days: int = 14,
    ) -> dict:
        avg_daily = prediction.get("avg_daily_demand") or 0
        days_left = prediction.get("days_until_empty")
        current   = prediction.get("current_qty") or 0

        recommended_qty = _safe(avg_daily * cover_days)
        urgency = "normal"
        message = f"Order {recommended_qty} {unit} to cover {cover_days} days of demand."

        if days_left is not None:
            if days_left <= 3:
                urgency = "urgent"
                message = f"Stock will run out in {days_left:.0f} days — order {recommended_qty} {unit} immediately."
            elif days_left <= 7:
                urgency = "soon"
                message = f"Stock will run out in {days_left:.0f} days — plan to order {recommended_qty} {unit} this week."
            elif current <= reorder_level:
                urgency = "reorder"
                message = f"Below reorder level — order {recommended_qty} {unit} to restock for {cover_days} days."

        return {
            "urgency":         urgency,
            "recommended_qty": recommended_qty,
            "cover_days":      cover_days,
            "message":         message,
            "unit":            unit,
        }

    async def run_inventory_analytics(self) -> dict:
        transactions    = await self._load_sale_transactions()
        inventory_items = await self._load_inventory_items()

        if not transactions:
            return {
                "available": False,
                "message":   "No sale transactions recorded yet. Record sales to enable demand forecasting.",
            }
        if not inventory_items:
            return {"available": False, "message": "No inventory items found."}

        daily_demand = self._compute_daily_demand(transactions)

        results  = []
        no_data  = []

        for item in inventory_items:
            name_lower  = (item.get("name") or "").lower().strip()
            current_qty = float(item.get("quantity")      or 0)
            reorder_lvl = float(item.get("reorder_level") or 0)
            unit        = item.get("unit") or "units"

            demand_series = daily_demand.get(name_lower, [])
            if not demand_series:
                no_data.append(item.get("name", ""))
                continue

            prediction = self._predict_stockout(name_lower, current_qty, demand_series)
            reorder    = self._reorder_recommendation(prediction, reorder_lvl, unit)

            results.append({
                "item_id":       item.get("id"),
                "item_name":     item.get("name"),
                "unit":          unit,
                "current_qty":   _safe(current_qty),
                "reorder_level": _safe(reorder_lvl),
                "status":        item.get("status", "active"),
                "prediction":    prediction,
                "reorder":       reorder,
            })

        def sort_key(r):
            rank = {"urgent": 0, "soon": 1, "reorder": 2, "normal": 3}
            days = r["prediction"].get("days_until_empty") or 9999
            return (rank.get(r["reorder"]["urgency"], 3), days)

        results.sort(key=sort_key)

        return {
            "available": True,
            "summary": {
                "total_items":       len(inventory_items),
                "tracked_items":     len(results),
                "untracked_items":   len(no_data),
                "urgent_items":      sum(1 for r in results if r["reorder"]["urgency"] == "urgent"),
                "soon_items":        sum(1 for r in results if r["reorder"]["urgency"] == "soon"),
                "transaction_count": len(transactions),
            },
            "items":   results,
            "no_data": no_data,
        }