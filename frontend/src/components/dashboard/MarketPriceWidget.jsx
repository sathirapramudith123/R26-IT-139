"use client";
import { useEffect, useState } from "react";
import { priceDataApi } from "@/services/api/priceData.api";

function PriceBar({ value, max, color = "bg-teal-500" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-700 w-16 text-right shrink-0">
        LKR {value?.toLocaleString()}
      </span>
    </div>
  );
}

export default function MarketPriceWidget() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("items");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    priceDataApi.getAnalytics()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="card animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-40 mb-4" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-3 bg-slate-100 rounded" />)}
      </div>
    </div>
  );

  if (!data?.available) return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🏛</span>
        <div>
          <h3 className="font-outfit font-semibold text-slate-900 text-sm">Market Price Data</h3>
          <p className="text-xs text-slate-400">HKARTI Wholesale Prices</p>
        </div>
      </div>
      <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
        No market price data available yet. Admin needs to upload the daily HKARTI price PDF.
      </div>
    </div>
  );

  const maxPrice = Math.max(...(data.item_analytics || []).map(i => i.cheapest_price || 0));
  const filtered = (data.item_analytics || []).filter(i =>
    !search || i.item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏛</span>
          <div>
            <h3 className="font-outfit font-semibold text-slate-900">Market Price Data</h3>
            <p className="text-xs text-slate-400">
              HKARTI Wholesale Prices · {data.report_date} · {data.total_items} items
            </p>
          </div>
        </div>
        <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-xs font-medium text-teal-700">
          Live
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(data.market_summary || []).slice(0, 3).map(m => (
          <div key={m.market} className="rounded-xl bg-slate-50 px-3 py-2 text-center">
            <p className="text-xs font-medium text-slate-600 truncate">{m.market}</p>
            <p className="text-sm font-bold text-teal-700">LKR {m.avg_price}</p>
            <p className="text-[10px] text-slate-400">avg</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {[["items", "By Item"], ["markets", "By Market"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition
              ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "items" && (
        <input type="text" placeholder="Search item..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-400" />
      )}

      {tab === "items" && (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {filtered.slice(0, 20).map(item => (
            <div key={item.item_name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-800">{item.item_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-600 font-medium">{item.cheapest_market}</span>
                  {item.price_spread > 50 && (
                    <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 rounded-full">
                      High spread
                    </span>
                  )}
                </div>
              </div>
              <PriceBar value={item.cheapest_price} max={maxPrice}
                color={item.price_spread > 100 ? "bg-amber-400" : "bg-teal-500"} />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Cheapest: LKR {item.cheapest_price} @ {item.cheapest_market}</span>
                <span>Spread: ±{item.price_spread}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">No items match "{search}"</p>
          )}
        </div>
      )}

      {tab === "markets" && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {(data.market_summary || []).map((m, i) => {
            const maxAvg = Math.max(...(data.market_summary || []).map(x => x.avg_price));
            return (
              <div key={m.market} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className={`text-xs font-bold w-5 ${i === 0 ? "text-emerald-600" : "text-slate-400"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-800 truncate">{m.market}</span>
                    <span className="text-xs font-bold text-slate-700">LKR {m.avg_price}</span>
                  </div>
                  <div className="h-1.5 bg-white rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i === 0 ? "bg-emerald-400" : "bg-slate-300"}`}
                      style={{ width: `${(m.avg_price / maxAvg) * 100}%` }} />
                  </div>
                </div>
                {i === 0 && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full shrink-0">
                    Cheapest
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-400 text-center">
        Source: Hector Kobbekaduwa Agrarian Research and Training Institute
      </p>
    </div>
  );
}