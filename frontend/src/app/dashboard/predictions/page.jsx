"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { insightsApi } from "@/services/api/insights";
import { formatCurrency } from "@/lib/formatters";

function Gauge({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 70 ? "#059669" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div
      className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${color} 0turn ${pct / 100}turn, #e2e8f0 ${pct / 100}turn 1turn)` }}
    >
      <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
        <span className="font-outfit text-xl font-bold" style={{ color }}>{pct.toFixed(0)}</span>
        <span className="text-[10px] text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

function Shap({ explanation }) {
  if (!explanation?.length) return null;
  return (
    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Why this result?</p>
      {explanation.slice(0, 3).map((f) => (
        <div key={f.feature} className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 truncate text-slate-700 dark:text-slate-300">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: f.impact > 0 ? "#059669" : "#ef4444" }} />
            {String(f.feature).replace(/_/g, " ")}
          </span>
          <span className="shrink-0 text-[10px] text-slate-400">
            {f.impact > 0 ? "+" : ""}{Number(f.impact).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

const NoData = ({ reason }) => (
  <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">{reason}</p>
);

export default function PredictionsDashboard() {
  useAuthGuard();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insightsApi.get()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Running your models…" />;
  if (!data) return <p className="text-sm text-red-600">Could not load insights.</p>;

  const { credit = {}, demand = {}, procurement = {}, anomaly = {} } = data;

  return (
    <div className="page-container">
      <PageHeader
        title="Smart Predictions"
        description="Four explainable models, running on your own data."
      />

      <div className="grid gap-5 lg:grid-cols-2">

        {/* C1 — CREDIT READINESS */}
        <div className="card">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400">C1</span>
              <h3 className="font-outfit font-semibold text-slate-900 dark:text-slate-100">Credit Readiness</h3>
            </div>
            <span className="text-2xl">💳</span>
          </div>

          {!credit.available ? <NoData reason={credit.reason} /> : (
            <>
              <div className="flex items-center gap-5">
                <Gauge score={credit.score} />
                <div className="min-w-0 flex-1">
                  <span className={`badge ${credit.prediction === 1
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"}`}>
                    {credit.prediction === 1 ? "Credit-ready ✓" : "Not yet ready"}
                  </span>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {credit.features?.months_active} months active ·{" "}
                    {credit.features?.avg_daily_txns} txns/day ·{" "}
                    {credit.features?.profit_margin_pct}% margin
                  </p>
                </div>
              </div>
              <Shap explanation={credit.explanation} />
              <Link href="/dashboard/predictions/credit"
                className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
                Try different values →
              </Link>
            </>
          )}
        </div>

        {/* C2 — DEMAND FORECAST */}
        <div className="card">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">C2</span>
              <h3 className="font-outfit font-semibold text-slate-900 dark:text-slate-100">Demand Forecast</h3>
            </div>
            <span className="text-2xl">📈</span>
          </div>

          {!demand.available ? <NoData reason={demand.reason} /> : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Next week for <b className="text-slate-800 dark:text-slate-200">{demand.item}</b>
              </p>
              <p className="mt-2 font-outfit text-4xl font-bold text-amber-600 dark:text-amber-400">
                {Number(demand.prediction).toFixed(0)}
                <span className="ml-1 text-base font-medium text-slate-400">units</span>
              </p>
              <Shap explanation={demand.explanation} />
              <Link href="/dashboard/predictions/demand"
                className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
                Forecast another item →
              </Link>
            </>
          )}
        </div>

        {/* C3 — BUY NOW OR WAIT */}
        <div className="card">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">C3</span>
              <h3 className="font-outfit font-semibold text-slate-900 dark:text-slate-100">Buy Now or Wait</h3>
            </div>
            <span className="text-2xl">🛒</span>
          </div>

          {!procurement.available ? <NoData reason={procurement.reason} /> : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                For <b className="text-slate-800 dark:text-slate-200">{procurement.item}</b>
              </p>
              <div className="mt-3 flex items-center gap-4">
                <span className={`rounded-2xl px-4 py-2 font-outfit text-lg font-bold ${
                  procurement.prediction === 1
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {procurement.prediction === 1 ? "Buy now" : "Wait"}
                </span>
                {typeof procurement.score === "number" && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {procurement.score.toFixed(0)}% confidence
                  </span>
                )}
              </div>
              <Shap explanation={procurement.explanation} />
              <Link href="/dashboard/predictions/procurement"
                className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
                Check another item →
              </Link>
            </>
          )}
        </div>

        {/* C4 — BANKING ANOMALY */}
        <div className="card">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">C4</span>
              <h3 className="font-outfit font-semibold text-slate-900 dark:text-slate-100">Banking Anomaly</h3>
            </div>
            <span className="text-2xl">🛡️</span>
          </div>

          {!anomaly.available ? <NoData reason={anomaly.reason} /> : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest: {anomaly.customer} · {formatCurrency(anomaly.amount)}
              </p>
              <div className="mt-3">
                <span className={`rounded-2xl px-4 py-2 font-outfit text-lg font-bold ${
                  anomaly.prediction === 1
                    ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"}`}>
                  {anomaly.prediction === 1 ? "⚠ Looks unusual" : "✓ Looks normal"}
                </span>
              </div>
              {typeof anomaly.score === "number" && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Anomaly score: {anomaly.score.toFixed(1)}/100
                </p>
              )}
              <Shap explanation={anomaly.explanation} />
              <Link href="/dashboard/predictions/anomaly"
                className="mt-3 inline-block text-xs font-semibold text-teal-700 hover:underline dark:text-teal-400">
                Check a transaction →
              </Link>
            </>
          )}
        </div>

      </div>
    </div>
  );
}