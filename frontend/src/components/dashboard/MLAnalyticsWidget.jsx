"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";

function TrendBadge({ trend }) {
  const map = {
    rising:  { icon: "↑", cls: "bg-red-50   text-red-700   border-red-200"   },
    falling: { icon: "↓", cls: "bg-green-50 text-green-700 border-green-200" },
    stable:  { icon: "→", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  };
  const t = map[trend] || map.stable;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${t.cls}`}>
      {t.icon} {trend}
    </span>
  );
}

function DemandBadge({ level }) {
  const map = {
    high:     "bg-red-50   text-red-700   border-red-200",
    moderate: "bg-amber-50 text-amber-700 border-amber-200",
    low:      "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${map[level] || map.moderate}`}>
      {level} demand
    </span>
  );
}

function MiniSparkline({ values = [], predicted = [] }) {
  const all = [...values, ...predicted].filter(Boolean);
  if (all.length < 2) return null;
  const W = 140, H = 36, pad = 4;
  const min = Math.min(...all), max = Math.max(...all), range = max - min || 1;
  const toX = (i, len) => pad + (i / (len - 1)) * (W - pad * 2);
  const toY = v => H - pad - ((v - min) / range) * (H - pad * 2);
  const aPoints = values.map((v, i) => `${toX(i, values.length)},${toY(v)}`).join(" ");
  const pStart = values.length - 1;
  const pTotal = values.length + predicted.length;
  const pPoints = [
    `${toX(pStart, pTotal)},${toY(values[values.length - 1])}`,
    ...predicted.map((v, i) => `${toX(pStart + i + 1, pTotal)},${toY(v)}`),
  ].join(" ");
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={aPoints} fill="none" stroke="#0F6E56" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={pPoints} fill="none" stroke="#7F77DD" strokeWidth="1.5"
        strokeDasharray="3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PriceBar({ value, max, color = "bg-teal-500" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-medium text-slate-600 w-14 text-right shrink-0">
        LKR {Number(value).toLocaleString()}
      </span>
    </div>
  );
}

const TABS = [
  { key: "prediction", label: "Price Prediction",     icon: "📈" },
  { key: "trends",     label: "Market Trends",         icon: "📊" },
  { key: "demand",     label: "Demand Forecasting",    icon: "🔮" },
  { key: "delivery",   label: "Delivery Optimization", icon: "🚚" },
  { key: "seasonal",   label: "Seasonal Patterns",     icon: "🌦" },
  { key: "comparison", label: "Market Comparison",     icon: "⚖️"  },
];

export default function MLAnalyticsWidget() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("prediction");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    apiClient.get("/ml/analytics")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="card animate-pulse space-y-3">
      <div className="h-4 bg-slate-100 rounded w-48" />
      {[1,2,3].map(i => <div key={i} className="h-3 bg-slate-100 rounded" />)}
    </div>
  );

  if (!data?.available) return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🤖</span>
        <div>
          <h3 className="font-outfit font-semibold text-slate-900">ML Price Analytics</h3>
          <p className="text-xs text-slate-400">6 models · Linear Regression · K-Means · Demand Index</p>
        </div>
      </div>
      <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-800">
        {data?.message || "Upload HKARTI PDFs to enable ML analytics."}
      </div>
    </div>
  );

  const { summary, price_prediction, market_trends, demand_forecast,
          delivery_opt, seasonal, market_comparison } = data;

  const filter = (arr, key) =>
    !search ? arr : arr.filter(r =>
      r[key]?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="card space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-outfit font-semibold text-slate-900">ML Price Analytics</h3>
            <p className="text-xs text-slate-400">
              {summary.date_count} days · {summary.item_count} items · {summary.date_range}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-medium text-purple-700">
          scikit-learn
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          ["📅", summary.date_count,          "Days of data" ],
          ["🥦", summary.item_count,          "Items tracked"],
          ["🏪", summary.market_count,        "Markets"      ],
          ["💰", `LKR ${summary.overall_avg}`, "Avg price"   ],
        ].map(([icon, val, label]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-2 py-2 text-center">
            <p className="text-sm">{icon}</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{val}</p>
            <p className="text-[9px] text-slate-400 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
            className={`rounded-lg py-1.5 px-1 text-center transition
              ${tab === t.key
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
            <div className="text-sm">{t.icon}</div>
            <div className="text-[9px] font-medium leading-tight mt-0.5">{t.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      {["prediction","trends","demand","seasonal","comparison"].includes(tab) && (
        <input type="text" placeholder="Search item..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-400" />
      )}

      {/* ── 1. PRICE PREDICTION ── */}
      {tab === "prediction" && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          <p className="text-[10px] text-slate-400">
            Linear Regression trained on {summary.date_count} days of data.
            <span className="ml-1" style={{color:"#7F77DD"}}>— — predicted (next 4 weeks)</span>
          </p>
          {filter(price_prediction || [], "item_name").map(p => (
            <div key={p.item_name} className="rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-slate-800 capitalize">{p.item_name}</p>
                  <p className="text-[10px] text-slate-400">
                    Current: LKR {p.current_price} · R² {p.r2_score} · {p.data_points} days
                  </p>
                </div>
                <TrendBadge trend={p.trend} />
              </div>
              <MiniSparkline values={p.actual_prices} predicted={p.predicted_prices} />
              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                <span>Next 4 wks: LKR {p.predicted_prices?.[0]} → {p.predicted_prices?.[3]}</span>
                <span>{p.date_range}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 2. MARKET TRENDS ── */}
      {tab === "trends" && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          <p className="text-[10px] text-slate-400 mb-2">
            7-day and 14-day moving averages. % change over full period.
          </p>
          {filter(market_trends || [], "item_name").map(t => (
            <div key={t.item_name} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-800 capitalize">{t.item_name}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium ${
                    (t.change_pct||0) > 0 ? "text-red-600" :
                    (t.change_pct||0) < 0 ? "text-green-600" : "text-slate-400"}`}>
                    {(t.change_pct||0) > 0 ? "+" : ""}{t.change_pct}%
                  </span>
                  <TrendBadge trend={t.trend} />
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Start: LKR {t.start_avg}</span>
                <span>Now: LKR {t.current_avg}</span>
                <span>{t.data_points} data pts</span>
              </div>
              {t.ma7 && t.ma7.length > 1 && (
                <div className="mt-1.5 h-4 bg-slate-100 rounded-full overflow-hidden flex gap-px p-px">
                  {t.ma7.slice(-14).map((v, i) => {
                    const maxV = Math.max(...(t.ma7 || [1]));
                    const pct  = maxV > 0 ? (v / maxV) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex items-end">
                        <div className="w-full bg-teal-400 rounded-sm"
                             style={{ height: `${Math.max(10, pct)}%` }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 3. DEMAND FORECASTING ── */}
      {tab === "demand" && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          <p className="text-[10px] text-slate-400 mb-2">
            Price velocity index. Fast rising price = high demand. Falling = low demand.
          </p>
          {filter(demand_forecast || [], "item_name").map(d => (
            <div key={d.item_name} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-800 capitalize">{d.item_name}</p>
                <DemandBadge level={d.demand_level} />
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    d.demand_level === "high"     ? "bg-red-400" :
                    d.demand_level === "moderate" ? "bg-amber-400" : "bg-green-400"}`}
                  style={{ width: `${d.demand_score || 50}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 italic">{d.forecast}</p>
              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                <span>Current: LKR {d.current_price}</span>
                <span>7-day velocity: {(d.velocity_7day||0) > 0 ? "+" : ""}{d.velocity_7day} LKR/day</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. DELIVERY OPTIMIZATION ── */}
      {tab === "delivery" && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          <p className="text-[10px] text-slate-400">
            K-Means clustering groups markets by price level and stability.
            Buy from green cluster markets to save the most.
          </p>
          {Object.entries(delivery_opt?.clusters || {}).map(([name, markets], ci) => {
            const colors = [
              "border-green-200 bg-green-50",
              "border-amber-200 bg-amber-50",
              "border-red-200   bg-red-50",
            ];
            const tc = ["text-green-700","text-amber-700","text-red-700"];
            return (
              <div key={name} className={`rounded-xl border p-3 ${colors[ci] || colors[0]}`}>
                <p className={`text-[10px] font-semibold mb-2 ${tc[ci] || tc[0]}`}>{name}</p>
                <div className="space-y-1">
                  {markets.map(m => (
                    <div key={m.market}
                      className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-slate-700 font-medium">{m.market}</span>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-800">LKR {m.avg_price}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">±{m.volatility}% vol</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {(delivery_opt?.top_recommendations || []).length > 0 && (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <p className="text-[10px] font-semibold text-slate-600 px-3 py-2 bg-slate-50 border-b border-slate-100">
                Best delivery source per item
              </p>
              {delivery_opt.top_recommendations.map(r => (
                <div key={r.item}
                  className="flex items-center justify-between px-3 py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-700">{r.item}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-teal-700 font-medium">{r.best_market}</span>
                    <span className="text-[10px] font-bold text-slate-700">LKR {r.avg_price}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5. SEASONAL PATTERNS ── */}
      {tab === "seasonal" && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          <p className="text-[10px] text-slate-400 mb-1">
            Monthly average prices. Shows which month is cheapest to buy each item.
          </p>
          {filter(seasonal || [], "item_name").map(s => {
            const maxP = Math.max(...(s.prices || [1]));
            const minP = Math.min(...(s.prices || [0]));
            return (
              <div key={s.item_name} className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-800 capitalize">{s.item_name}</p>
                  <span className="text-[10px] text-teal-700 font-medium">
                    Cheapest: {s.cheapest_month}
                  </span>
                </div>
                <div className="flex items-end gap-1 h-8">
                  {(s.months || []).map((month, i) => {
                    const price = s.prices[i] || 0;
                    const pct   = maxP > minP ? ((price - minP) / (maxP - minP)) * 100 : 50;
                    const isCheapest  = month === s.cheapest_month;
                    const isExpensive = month === s.expensive_month;
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full rounded-sm"
                          style={{
                            height: `${20 + pct * 0.12}px`,
                            background: isCheapest ? "#1D9E75" : isExpensive ? "#E24B4A" : "#94a3b8"
                          }} />
                        <span className="text-[8px] text-slate-400">{month}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">{s.insight}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 6. MARKET COMPARISON ── */}
      {tab === "comparison" && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
            <p className="text-xs font-semibold text-teal-800 mb-1">Overall cheapest market</p>
            <p className="text-base font-bold text-teal-700">{market_comparison?.overall_cheapest}</p>
            <p className="text-[10px] text-teal-600 mt-0.5">
              Most expensive: {market_comparison?.overall_expensive}
            </p>
          </div>
          <p className="text-[10px] text-slate-400">
            Price difference between cheapest and most expensive market per item.
          </p>
          {filter(market_comparison?.item_comparisons || [], "item_name").map(c => {
            const maxP = c.expensive_price || 1;
            return (
              <div key={c.item_name} className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-800 capitalize">{c.item_name}</p>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-medium">
                    Save {c.saving_pct}%
                  </span>
                </div>
                <div className="space-y-1">
                  <PriceBar value={c.cheapest_price}  max={maxP} color="bg-emerald-400" />
                  <PriceBar value={c.expensive_price} max={maxP} color="bg-red-300" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>✓ {c.cheapest_market} — LKR {c.cheapest_price}</span>
                  <span>✗ {c.expensive_market} — LKR {c.expensive_price}</span>
                </div>
                <p className="text-[10px] text-teal-600 italic mt-1">{c.insight}</p>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-400 text-center pt-1">
        Data: HKARTI · Models: Linear Regression · Moving Avg · K-Means · Demand Index
      </p>
    </div>
  );
}