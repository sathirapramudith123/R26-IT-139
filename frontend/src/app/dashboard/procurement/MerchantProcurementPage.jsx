"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import MarketPriceWidget from "@/components/dashboard/MarketPriceWidget";
import MLAnalyticsWidget from "@/components/dashboard/MLAnalyticsWidget";
import useProcurement from "@/hooks/useProcurement";
import { priceDataApi } from "@/services/api/priceData.api";
import { formatCurrency } from "@/lib/formatters/index";

function StatCard({ icon, label, value, sub, color = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 mb-1">{label}</p>
          <p className={`text-2xl font-bold font-outfit ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }) {
  const pct = Math.min(100, Math.max(0, Number(score || 0)));
  const col = pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-32 text-xs text-slate-500 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${col}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-8 text-right shrink-0">
        {pct.toFixed(0)}
      </span>
    </div>
  );
}

export default function MerchantProcurementPage() {
  const { items, loading, fetchAll } = useProcurement();
  const [analytics, setAnalytics]   = useState(null);

  useEffect(() => {
    fetchAll();
    priceDataApi.getAnalytics()
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, [fetchAll]);

  const total      = items.length;
  const completed  = items.filter(i => i.status === "completed").length;
  const pending    = items.filter(i => i.status === "pending").length;
  const totalSaved = items
    .filter(i => i.estimated_profit > 0)
    .reduce((acc, i) => acc + Number(i.estimated_profit || 0), 0);

  const bestDecision = [...items]
    .sort((a, b) => Number(b.final_score || 0) - Number(a.final_score || 0))[0];

  const recentDecisions = [...items]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const cheapestItems = (analytics?.item_analytics || [])
    .sort((a, b) => a.cheapest_price - b.cheapest_price)
    .slice(0, 5);

  return (
    <div className="page-container">
      <PageHeader
        title="Smart Procurement"
        description="Market prices, procurement analytics and supplier performance."
      />

      {/* Summary stats */}
      {loading ? <LoadingSpinner label="Loading..." /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="🛒" label="Total Decisions"
            value={total} color="text-slate-900" />
          <StatCard icon="✅" label="Completed"
            value={completed} color="text-emerald-600"
            sub={total ? `${Math.round((completed/total)*100)}% success rate` : undefined} />
          <StatCard icon="⏳" label="Pending"
            value={pending} color="text-amber-600" />
          <StatCard icon="💰" label="Total Est. Profit"
            value={formatCurrency(totalSaved)} color="text-teal-700"
            sub="from completed decisions" />
        </div>
      )}

      {/* Market price chart */}
      <MarketPriceWidget />

      {/* ML analytics — 6 tabs */}
      <MLAnalyticsWidget />

      {/* Best decision + cheapest items */}
      <div className="grid gap-6 lg:grid-cols-2">

        {bestDecision ? (
          <Card>
            <h3 className="font-outfit font-semibold text-slate-900 mb-4">
              🏆 Best Procurement Decision
            </h3>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 mb-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-900">{bestDecision.item_name}</p>
                  <p className="text-xs text-slate-500">
                    Supplier: {bestDecision.selected_supplier_name || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Score</p>
                  <p className="text-xl font-bold text-emerald-700">
                    {Number(bestDecision.final_score || 0).toFixed(1)}
                    <span className="text-xs font-normal text-slate-400">/100</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white rounded-lg px-3 py-2">
                  <p className="text-slate-400">Total Cost</p>
                  <p className="font-semibold text-slate-800">{formatCurrency(bestDecision.total_cost)}</p>
                </div>
                <div className="bg-white rounded-lg px-3 py-2">
                  <p className="text-slate-400">Est. Profit</p>
                  <p className={`font-semibold ${Number(bestDecision.estimated_profit) >= 0
                    ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(bestDecision.estimated_profit)}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-0.5">
              <ScoreBar label="Cost (40%)"        score={bestDecision.price_score} />
              <ScoreBar label="Profit (30%)"      score={bestDecision.profit_score} />
              <ScoreBar label="Reliability (20%)" score={bestDecision.reliability_score} />
              <ScoreBar label="Delivery (10%)"    score={bestDecision.delivery_score} />
            </div>
          </Card>
        ) : (
          <Card>
            <h3 className="font-outfit font-semibold text-slate-900 mb-3">
              🏆 Best Procurement Decision
            </h3>
            <div className="rounded-xl bg-slate-50 px-4 py-6 text-center">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm text-slate-500">No decisions saved yet.</p>
            </div>
          </Card>
        )}

        <Card>
          <h3 className="font-outfit font-semibold text-slate-900 mb-4">
            💡 Cheapest Items Today
          </h3>
          {!analytics?.available ? (
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-4 text-xs text-amber-700">
              No market price data yet. Admin needs to upload the daily HKARTI price PDF.
            </div>
          ) : (
            <div className="space-y-2">
              {cheapestItems.map((item, i) => (
                <div key={item.item_name}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className={`text-xs font-bold w-5 ${i === 0 ? "text-emerald-600" : "text-slate-400"}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{item.item_name}</p>
                    <p className="text-[10px] text-slate-400">{item.cheapest_market}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-teal-700">
                      LKR {item.cheapest_price?.toLocaleString()}
                    </p>
                    {item.price_spread > 0 && (
                      <p className="text-[10px] text-slate-400">±{item.price_spread} spread</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {analytics?.report_date && (
            <p className="text-[10px] text-slate-400 mt-3">
              Data from {analytics.report_date} · HKARTI
            </p>
          )}
        </Card>
      </div>

      {/* Recent decisions */}
      {recentDecisions.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-outfit font-semibold text-slate-900">
              Recent Decisions
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({recentDecisions.length} of {total})
              </span>
            </h3>
          </div>
          <div className="space-y-2">
            {recentDecisions.map(d => (
              <div key={d.id}
                className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{d.item_name}</p>
                  <p className="text-xs text-slate-400">
                    {d.selected_supplier_name || "—"} · Qty {d.quantity}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-700">{formatCurrency(d.total_cost)}</p>
                  <p className={`text-xs font-semibold ${Number(d.estimated_profit) >= 0
                    ? "text-emerald-600" : "text-red-500"}`}>
                    {formatCurrency(d.estimated_profit)}
                  </p>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium
                  ${d.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                    d.status === "pending"   ? "bg-amber-50  text-amber-700"   :
                                               "bg-slate-100 text-slate-500"}`}>
                  {d.status}
                </span>
                <Link href={`/dashboard/procurement/${d.id}`} className="shrink-0">
                  <span className="text-xs text-teal-600 hover:underline">View →</span>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}