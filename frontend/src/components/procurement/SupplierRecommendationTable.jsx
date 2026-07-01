"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters/index";
import { procurementApi } from "@/services/api/procurement";

function scoreBarColor(pct) {
  if (pct >= 70) return "bg-emerald-400";
  if (pct >= 40) return "bg-amber-400";
  return "bg-red-400";
}

export default function SupplierRecommendationTable({ results = [], requestData = {}, onSave }) {
  const router     = useRouter();
  const [savingId, setSavingId] = useState(null);
  const [error,    setError]    = useState(null);

  const hasMarketData = results.some(r => r.market_avg_price != null);

  async function handleSave(s) {
    setSavingId(s.supplier_id); setError(null);
    try {
      const saved = await procurementApi.create({
        item_name:              requestData.item_name  ?? "Unknown",
        quantity:               requestData.quantity,
        delivery_location:      requestData.delivery_location,
        required_delivery_date: requestData.required_delivery_date,
        expected_selling_price: requestData.expected_selling_price,
        selected_supplier_id:   s.supplier_id,
        selected_supplier_name: s.supplier_name,
        unit_price:             s.unit_price,
        delivery_cost:          s.delivery_cost,
        total_cost:             s.total_cost,
        estimated_profit:       s.estimated_profit,
        final_score:            s.final_score,
        market_avg_price:       s.market_avg_price,
        vs_market_pct:          s.vs_market_pct,
        status:                 "pending",
      });
      if (onSave) onSave(saved);
      else router.push(`/dashboard/procurement/${saved.id}`);
    } catch (err) {
      setError(err.message || "Failed to save decision.");
    } finally {
      setSavingId(null);
    }
  }

  const SCORE_COLS = [
    ["Cost 40%",        "price_score"],
    ["Profit 30%",      "profit_score"],
    ["Reliability 20%", "reliability_score"],
    ["Delivery 10%",    "delivery_score"],
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-outfit text-lg font-semibold text-slate-800">
          {results.length} supplier{results.length !== 1 ? "s" : ""} found
        </h2>
        <div className="flex items-center gap-2">
          {hasMarketData && (
            <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-xs font-medium text-teal-700">
              🏛 Using HKARTI market prices
            </span>
          )}
          <p className="text-xs text-slate-400">Ranked best first</p>
        </div>
      </div>

      {/* Market price info banner */}
      {hasMarketData && results[0]?.market_avg_price && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <strong>Government market average for {requestData.item_name}:</strong>{" "}
          LKR {results[0].market_avg_price?.toLocaleString()}/unit
          {" "}— prices compared against the Hector Kobbekaduwa Agrarian Research and Training Institute wholesale benchmark.
        </div>
      )}

      {results.map(s => (
        <div key={s.supplier_id}
          className={`rounded-2xl border bg-white p-5 ${s.rank === 1 ? "border-emerald-300 ring-1 ring-emerald-100" : "border-slate-200"}`}>

          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold
                ${s.rank === 1 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                #{s.rank}
              </div>
              <div>
                <h3 className="font-outfit text-base font-bold text-slate-900">{s.supplier_name}</h3>
                {s.rank === 1 && (
                  <span className="mt-0.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Best match
                  </span>
                )}
                {/* Market comparison badge */}
                {s.vs_market_pct != null && (
                  <span className={`ml-1 mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium
                    ${s.vs_market_pct < 0
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : s.vs_market_pct > 5
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                    {s.market_comparison}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400">Final score</p>
              <p className="text-xl font-bold text-slate-800">
                {Number(s.final_score ?? 0).toFixed(1)}
                <span className="text-sm font-normal text-slate-400">/100</span>
              </p>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            {[
              ["Unit Price",  formatCurrency(s.unit_price)],
              ["Delivery",    formatCurrency(s.delivery_cost)],
              ["Total Cost",  formatCurrency(s.total_cost)],
              ["Est. Profit", formatCurrency(s.estimated_profit)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-400">{l}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{v}</p>
              </div>
            ))}
          </div>

          {/* Score bars */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
            {SCORE_COLS.map(([label, key]) => {
              const pct = Math.min(100, Math.max(0, Number(s[key] ?? 0)));
              return (
                <div key={key} className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-xs font-bold text-slate-700">{Number(s[key] ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${scoreBarColor(pct)}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Score explanation */}
          <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Why ranked #{s.rank}:</strong>{" "}
            Price score based on {s.score_breakdown?.price_basis ?? "supplier comparison"}.
            {s.vs_market_pct != null && ` Supplier quotes ${Math.abs(s.vs_market_pct)}% ${s.vs_market_pct < 0 ? "below" : "above"} the government wholesale average.`}
            {" "}Reliability {s.reliability_score >= 80 ? "excellent" : s.reliability_score >= 60 ? "good" : "building"} ({s.reliability_score?.toFixed(0)}/100).
            {" "}Delivers in {s.days_to_deliver} day{s.days_to_deliver !== 1 ? "s" : ""}.
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleSave(s)}
              disabled={savingId === s.supplier_id}
              className="rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60">
              {savingId === s.supplier_id ? "Saving..." : "Save this decision"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
