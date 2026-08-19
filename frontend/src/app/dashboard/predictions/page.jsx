"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { insightsApi } from "@/services/api/insights";
import { formatCurrency } from "@/lib/formatters";

// Modern Ring Gauge Component
function Gauge({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const strokeDashoffset = 251.2 - (251.2 * pct) / 100;
  const colorClass =
    pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          className="stroke-slate-100 dark:stroke-slate-800"
          strokeWidth="10"
          fill="transparent"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          className={`transition-all duration-1000 ease-out stroke-current ${colorClass}`}
          strokeWidth="10"
          strokeDasharray="251.2"
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`font-outfit text-xl font-bold ${colorClass}`}>
          {pct.toFixed(0)}
        </span>
        <span className="text-[10px] text-slate-400 font-medium">/ 100</span>
      </div>
    </div>
  );
}

// Visual SHAP Feature Impact Component
function VisualShap({ explanation }) {
  if (!explanation?.length) return null;

  const maxImpact = Math.max(...explanation.map((f) => Math.abs(f.impact)), 0.01);

  return (
    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        Key Driving Factors (SHAP Explanation)
      </p>
      {explanation.slice(0, 3).map((f) => {
        const isPositive = f.impact > 0;
        const widthPct = Math.min(100, (Math.abs(f.impact) / maxImpact) * 100);

        return (
          <div key={f.feature} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                {String(f.feature).replace(/_/g, " ")}
              </span>
              <span
                className={`font-mono text-[11px] font-bold ${
                  isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {isPositive ? "+" : ""}
                {Number(f.impact).toFixed(2)}
              </span>
            </div>
            {/* Visual Bar */}
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPositive ? "bg-emerald-500" : "bg-rose-500"
                }`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const NoData = ({ reason }) => (
  <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
    <p className="text-sm text-slate-500 dark:text-slate-400">{reason || "Data Unavailable"}</p>
  </div>
);

export default function PredictionsDashboard() {
  useAuthGuard();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insightsApi
      .get()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Running predictive AI models..." />;
  if (!data)
    return (
      <div className="p-6 text-center text-rose-600 font-medium">
        Failed to fetch prediction models payload.
      </div>
    );

  const { credit = {}, demand = {}, procurement = {}, anomaly = {} } = data;

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Predictive Intelligence Engine"
        description="Real-time explainable Machine Learning forecasts driven by your business data."
      />

      {/* Top High-level Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Credit Status</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">
            {credit.prediction === 1 ? "✅ Eligible" : "⚠️ Review"}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Demand Forecast</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
            {demand.available ? `${Number(demand.prediction).toFixed(0)} Units` : "N/A"}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Procurement Action</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">
            {procurement.prediction === 1 ? "🛒 Buy Now" : "⏳ Hold"}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Security Alert</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">
            {anomaly.prediction === 1 ? "🚨 Anomaly" : "🛡️ Clear"}
          </p>
        </div>
      </div>

      {/* Grid Layout for Model Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* C1 — CREDIT READINESS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400 text-xs font-bold rounded-md">
                  C1 Model
                </span>
                <h3 className="font-outfit font-semibold text-lg text-slate-900 dark:text-slate-100">
                  Credit Readiness
                </h3>
              </div>
              <span className="text-2xl">💳</span>
            </div>

            {!credit.available ? (
              <NoData reason={credit.reason} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                  <Gauge score={credit.score} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        credit.prediction === 1
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                      }`}
                    >
                      {credit.prediction === 1 ? "Credit Ready ✓" : "Requires Health Improvement"}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Active: <b className="text-slate-700 dark:text-slate-200">{credit.features?.months_active} mo</b> · 
                      Daily Txns: <b className="text-slate-700 dark:text-slate-200">{credit.features?.avg_daily_txns}</b> · 
                      Margin: <b className="text-slate-700 dark:text-slate-200">{credit.features?.profit_margin_pct}%</b>
                    </p>
                  </div>
                </div>
                <VisualShap explanation={credit.explanation} />
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/dashboard/predictions/credit"
              className="inline-flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 transition"
            >
              Simulate & Test Feature Scenarios →
            </Link>
          </div>
        </div>

        {/* C2 — DEMAND FORECAST */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 text-xs font-bold rounded-md">
                  C2 Model
                </span>
                <h3 className="font-outfit font-semibold text-lg text-slate-900 dark:text-slate-100">
                  Demand Forecast
                </h3>
              </div>
              <span className="text-2xl">📈</span>
            </div>

            {!demand.available ? (
              <NoData reason={demand.reason} />
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Target Inventory Item: <b className="text-slate-800 dark:text-slate-200">{demand.item}</b>
                  </p>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="font-outfit text-4xl font-extrabold text-amber-600 dark:text-amber-400">
                      {Number(demand.prediction).toFixed(0)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Expected Units Next Wk
                    </span>
                  </div>
                </div>
                <VisualShap explanation={demand.explanation} />
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/dashboard/predictions/demand"
              className="inline-flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline transition"
            >
              Run Detailed Item Forecast →
            </Link>
          </div>
        </div>

        {/* C3 — BUY NOW OR WAIT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400 text-xs font-bold rounded-md">
                  C3 Model
                </span>
                <h3 className="font-outfit font-semibold text-lg text-slate-900 dark:text-slate-100">
                  Procurement Optimizer
                </h3>
              </div>
              <span className="text-2xl">🛒</span>
            </div>

            {!procurement.available ? (
              <NoData reason={procurement.reason} />
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Item Evaluated</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{procurement.item}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-4 py-2 rounded-xl font-outfit text-base font-bold ${
                        procurement.prediction === 1
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {procurement.prediction === 1 ? "Buy Now" : "Wait / Hold"}
                    </span>
                    {typeof procurement.score === "number" && (
                      <span className="text-xs font-bold text-slate-500">
                        {procurement.score.toFixed(0)}% Conf.
                      </span>
                    )}
                  </div>
                </div>
                <VisualShap explanation={procurement.explanation} />
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/dashboard/predictions/procurement"
              className="inline-flex items-center text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline transition"
            >
              Analyze Procurement Timing →
            </Link>
          </div>
        </div>

        {/* C4 — BANKING ANOMALY */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 text-xs font-bold rounded-md">
                  C4 Model
                </span>
                <h3 className="font-outfit font-semibold text-lg text-slate-900 dark:text-slate-100">
                  Banking Anomaly Monitor
                </h3>
              </div>
              <span className="text-2xl">🛡️</span>
            </div>

            {!anomaly.available ? (
              <NoData reason={anomaly.reason} />
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Latest Transaction</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {anomaly.customer} · {formatCurrency(anomaly.amount)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-xl font-outfit text-sm font-bold ${
                      anomaly.prediction === 1
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {anomaly.prediction === 1 ? "⚠ Unusual Activity" : "✓ Normal"}
                  </span>
                </div>
                <VisualShap explanation={anomaly.explanation} />
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/dashboard/predictions/anomaly"
              className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline transition"
            >
              Verify Specific Transaction →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}