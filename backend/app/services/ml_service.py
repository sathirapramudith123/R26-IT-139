"""
MLService — Lanka-Link Procurement Analytics
=============================================
Runs 6 ML models on historical HKARTI price data stored in MongoDB.

Flow:
  PDF upload → parse → save to MongoDB → MLService reads MongoDB
  → runs models → returns analytics for dashboard

Models:
  1. Linear Regression     — Price Prediction (next 4 weeks)
  2. Moving Average        — Market Trend Analysis
  3. Demand Index          — Demand Forecasting (price velocity proxy)
  4. K-Means Clustering    — Delivery Optimization (market grouping)
  5. Monthly Decomposition — Seasonal Price Patterns
  6. Cross-market Stats    — Market Comparison
"""

import io
import csv
import numpy as np
import pandas as pd
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


def _safe(v, decimals=2):
    if v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v))):
        return None
    return round(float(v), decimals)


def _normalize(values, reverse=False):
    mn, mx = min(values), max(values)
    if mx == mn:
        return [50.0] * len(values)
    norm = [(v - mn) / (mx - mn) * 100 for v in values]
    return [100 - n if reverse else n for n in norm]


class MLService:
    def __init__(self, repo=None):
        from app.repositories.price_data_repository import PriceDataRepository
        self.repo = repo or PriceDataRepository()

    async def _load_all(self):
        cursor = self.repo.collection.find({}, {"_id": 0}).sort("date", 1)
        return await cursor.to_list(50000)

    def _to_dataframe(self, records):
        df = pd.DataFrame(records)
        if df.empty:
            return df
        df["date"]       = pd.to_datetime(df["date"])
        df["avg_price"]  = pd.to_numeric(df["avg_price"], errors="coerce")
        df = df.dropna(subset=["avg_price", "date"])
        df["item_lower"] = df["item_name"].str.lower().str.strip()
        df["month"]      = df["date"].dt.month
        df["month_name"] = df["date"].dt.strftime("%b")
        df["week"]       = df["date"].dt.isocalendar().week.astype(int)
        df["day_index"]  = (df["date"] - df["date"].min()).dt.days
        return df

    def _to_csv_bytes(self, records):
        if not records:
            return b"date,item_name,category,market,min_price,max_price,avg_price\n"
        fields = ["date","item_name","category","market",
                  "min_price","max_price","avg_price"]
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(records)
        return buf.getvalue().encode("utf-8")

    # ── 1. Price Prediction — Linear Regression ───────────────────────────────

    def _price_prediction(self, df, top_n=10):
        results = []
        items = (df.groupby("item_lower")
                   .size()
                   .sort_values(ascending=False)
                   .head(top_n)
                   .index.tolist())

        for item in items:
            sub = df[df["item_lower"] == item].sort_values("date")
            if len(sub) < 5:
                continue

            X = sub["day_index"].values.reshape(-1, 1)
            y = sub["avg_price"].values
            model = LinearRegression()
            model.fit(X, y)
            r2    = _safe(model.score(X, y), 3)

            last_day = int(sub["day_index"].max())
            future_X = np.arange(last_day + 7, last_day + 35, 7).reshape(-1, 1)
            preds    = [_safe(p) for p in model.predict(future_X)]
            slope    = _safe(float(model.coef_[0]), 4)
            trend    = "rising" if slope > 0.5 else "falling" if slope < -0.5 else "stable"

            results.append({
                "item_name":        sub["item_name"].iloc[-1],
                "current_price":    _safe(float(sub["avg_price"].iloc[-1])),
                "predicted_prices": preds,
                "trend":            trend,
                "slope_per_day":    slope,
                "r2_score":         r2,
                "data_points":      len(sub),
                "date_range":       f"{sub['date'].min().strftime('%Y-%m-%d')} → {sub['date'].max().strftime('%Y-%m-%d')}",
                "actual_prices":    [_safe(v) for v in y[-14:].tolist()],
                "actual_dates":     sub["date"].dt.strftime("%Y-%m-%d").tolist()[-14:],
            })
        return results

    # ── 2. Market Trend Analysis — Moving Average ─────────────────────────────

    def _market_trend_analysis(self, df):
        results = []
        for item, sub in df.groupby("item_lower"):
            sub = sub.sort_values("date")
            if len(sub) < 7:
                continue

            prices = sub["avg_price"].values
            ma7    = pd.Series(prices).rolling(7,  min_periods=1).mean().round(2).tolist()
            ma14   = pd.Series(prices).rolling(14, min_periods=1).mean().round(2).tolist()

            first_avg  = float(np.mean(prices[:7]))
            last_avg   = float(np.mean(prices[-7:]))
            change_pct = _safe(
                ((last_avg - first_avg) / first_avg * 100) if first_avg > 0 else 0, 1
            )
            trend = ("rising"  if (change_pct or 0) >  5 else
                     "falling" if (change_pct or 0) < -5 else "stable")

            results.append({
                "item_name":   sub["item_name"].iloc[-1],
                "trend":       trend,
                "change_pct":  change_pct,
                "current_avg": _safe(last_avg),
                "start_avg":   _safe(first_avg),
                "ma7":         [_safe(v) for v in ma7[-14:]],
                "ma14":        [_safe(v) for v in ma14[-14:]],
                "dates":       sub["date"].dt.strftime("%Y-%m-%d").tolist()[-14:],
                "data_points": len(sub),
            })

        results.sort(key=lambda x: abs(x["change_pct"] or 0), reverse=True)
        return results[:20]

    # ── 3. Demand Forecasting — Price Velocity Index ──────────────────────────

    def _demand_forecasting(self, df):
        results = []
        for item, sub in df.groupby("item_lower"):
            sub = sub.sort_values("date")
            if len(sub) < 7:
                continue

            prices      = sub["avg_price"].values
            velocity    = np.diff(prices)
            rolling_vel = pd.Series(velocity).rolling(7, min_periods=1).mean().values
            current_vel = float(rolling_vel[-1]) if len(rolling_vel) > 0 else 0

            if current_vel > 5:
                demand_level = "high"
                forecast     = "Price likely to continue rising — stock up now"
            elif current_vel < -5:
                demand_level = "low"
                forecast     = "Price likely to fall further — wait before buying"
            else:
                demand_level = "moderate"
                forecast     = "Price stable — normal procurement timing"

            results.append({
                "item_name":     sub["item_name"].iloc[-1],
                "demand_level":  demand_level,
                "demand_score":  _safe(min(100, max(0, 50 + (current_vel * 2)))),
                "forecast":      forecast,
                "current_price": _safe(float(prices[-1])),
                "velocity_7day": _safe(current_vel, 1),
                "price_history": [_safe(v) for v in prices[-7:].tolist()],
                "dates":         sub["date"].dt.strftime("%Y-%m-%d").tolist()[-7:],
            })

        results.sort(key=lambda x: abs(x["velocity_7day"] or 0), reverse=True)
        return results[:15]

    # ── 4. Delivery Optimization — K-Means Clustering ────────────────────────

    def _delivery_optimization(self, df):
        market_stats = []
        markets      = []

        for market, sub in df.groupby("market"):
            prices = sub["avg_price"].values
            if len(prices) < 5:
                continue
            mean_p = float(np.mean(prices))
            std_p  = float(np.std(prices))
            cv     = (std_p / mean_p * 100) if mean_p > 0 else 0
            market_stats.append([mean_p, cv])
            markets.append({
                "market":      market,
                "avg_price":   _safe(mean_p),
                "volatility":  _safe(cv, 1),
                "item_count":  int(sub["item_lower"].nunique()),
                "data_points": len(sub),
            })

        if len(markets) < 3:
            return {"error": "Not enough markets for clustering"}

        X        = np.array(market_stats)
        scaler   = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        n_clusters = min(3, len(markets))
        kmeans     = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels     = kmeans.fit_predict(X_scaled)

        cluster_mean = {}
        for label, stat in zip(labels, market_stats):
            cluster_mean.setdefault(label, []).append(stat[0])

        sorted_labels = sorted(cluster_mean.keys(),
                               key=lambda c: np.mean(cluster_mean[c]))
        rank_map      = {c: i for i, c in enumerate(sorted_labels)}

        cluster_names = [
            "Best Value Markets — lowest average prices",
            "Mid-Range Markets — moderate prices",
            "Premium Markets — highest prices",
        ]

        clusters = defaultdict(list)
        for market, label in zip(markets, labels):
            rank  = rank_map[int(label)]
            cname = cluster_names[rank] if rank < len(cluster_names) else f"Group {rank}"
            clusters[cname].append(market)

        best_markets  = (df.groupby(["item_lower","market"])["avg_price"]
                           .mean().reset_index().sort_values("avg_price"))
        best_per_item = (best_markets.groupby("item_lower").first().reset_index()
                         [["item_lower","market","avg_price"]]
                         .rename(columns={"market":"best_market","avg_price":"best_price"}))

        top_recommendations = [
            {
                "item":        row["item_lower"].title(),
                "best_market": row["best_market"],
                "avg_price":   _safe(row["best_price"]),
            }
            for _, row in best_per_item.head(10).iterrows()
        ]

        return {
            "clusters":            dict(clusters),
            "n_clusters":          n_clusters,
            "top_recommendations": top_recommendations,
            "description":         "Markets grouped by price level and stability (K-Means)",
        }

    # ── 5. Seasonal Price Patterns — Monthly Decomposition ───────────────────

    def _seasonal_patterns(self, df):
        results     = []
        month_order = ["Jan","Feb","Mar","Apr","May","Jun",
                       "Jul","Aug","Sep","Oct","Nov","Dec"]

        for item, sub in df.groupby("item_lower"):
            if len(sub) < 14:
                continue
            monthly = sub.groupby("month_name")["avg_price"].mean().round(2).to_dict()
            if len(monthly) < 2:
                continue

            ordered = {m: monthly[m] for m in month_order if m in monthly}
            prices  = list(ordered.values())
            months  = list(ordered.keys())
            if not prices:
                continue

            cheapest_month  = months[prices.index(min(prices))]
            expensive_month = months[prices.index(max(prices))]

            results.append({
                "item_name":       sub["item_name"].iloc[-1],
                "monthly_prices":  ordered,
                "months":          months,
                "prices":          [_safe(p) for p in prices],
                "cheapest_month":  cheapest_month,
                "expensive_month": expensive_month,
                "seasonal_range":  _safe(max(prices) - min(prices)),
                "avg_price":       _safe(float(np.mean(prices))),
                "insight": (
                    f"Cheapest in {cheapest_month} (LKR {_safe(min(prices))}), "
                    f"most expensive in {expensive_month} (LKR {_safe(max(prices))})"
                ),
            })

        results.sort(key=lambda x: x["seasonal_range"] or 0, reverse=True)
        return results[:15]

    # ── 6. Market Comparison — Cross-market Analysis ──────────────────────────

    def _market_comparison(self, df):
        results = []
        for item, sub in df.groupby("item_lower"):
            by_market = sub.groupby("market")["avg_price"].mean().round(2)
            if len(by_market) < 2:
                continue

            prices  = by_market.values.tolist()
            markets = by_market.index.tolist()
            ci      = prices.index(min(prices))
            ei      = prices.index(max(prices))
            saving  = _safe(
                (max(prices) - min(prices)) / max(prices) * 100
                if max(prices) > 0 else 0, 1
            )

            results.append({
                "item_name":        sub["item_name"].iloc[-1],
                "cheapest_market":  markets[ci],
                "cheapest_price":   _safe(min(prices)),
                "expensive_market": markets[ei],
                "expensive_price":  _safe(max(prices)),
                "price_spread":     _safe(max(prices) - min(prices)),
                "saving_pct":       saving,
                "market_prices":    {m: _safe(p) for m, p in zip(markets, prices)},
                "market_count":     len(by_market),
                "insight": f"Buy from {markets[ci]} — save {saving}% vs {markets[ei]}",
            })

        results.sort(key=lambda x: x["saving_pct"] or 0, reverse=True)
        market_overall = df.groupby("market")["avg_price"].mean().round(2).sort_values()

        return {
            "item_comparisons":  results[:20],
            "overall_cheapest":  market_overall.index[0]  if len(market_overall) > 0 else "—",
            "overall_expensive": market_overall.index[-1] if len(market_overall) > 0 else "—",
            "market_avg_prices": market_overall.to_dict(),
        }

    # ── Main entry point ──────────────────────────────────────────────────────

    async def run_full_analytics(self, item_filter=None):
        records = await self._load_all()
        dates   = await self.repo.get_all_dates()

        if not records:
            return {
                "available": False,
                "message":   "No price data yet. Upload HKARTI PDFs to enable ML analytics.",
            }

        df = self._to_dataframe(records)
        if df.empty:
            return {"available": False, "message": "No valid price data found."}

        if item_filter:
            df_f = df[df["item_lower"].str.contains(item_filter.lower().strip(), na=False)]
        else:
            df_f = df

        all_prices = df["avg_price"].dropna().values
        summary = {
            "total_records": len(records),
            "date_count":    len(dates),
            "item_count":    int(df["item_lower"].nunique()),
            "market_count":  int(df["market"].nunique()),
            "date_range":    f"{min(dates)} → {max(dates)}" if dates else "—",
            "overall_avg":   _safe(float(np.mean(all_prices))) if len(all_prices) else 0,
        }

        return {
            "available":         True,
            "summary":           summary,
            "price_prediction":  self._price_prediction(df_f if item_filter else df),
            "market_trends":     self._market_trend_analysis(df),
            "demand_forecast":   self._demand_forecasting(df),
            "delivery_opt":      self._delivery_optimization(df),
            "seasonal":          self._seasonal_patterns(df),
            "market_comparison": self._market_comparison(df),
            "csv_ready":         True,
            "dates":             sorted(dates),
        }

    async def export_csv(self):
        records = await self._load_all()
        return self._to_csv_bytes(records)