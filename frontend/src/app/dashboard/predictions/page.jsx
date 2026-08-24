"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { insightsApi } from "@/services/api/insights";
import { formatCurrency } from "@/lib/formatters";

/* -------------------------------------------------------------------------- */
/*  Plain-language helpers                                                    */
/* -------------------------------------------------------------------------- */

const FEATURE_LABELS = {
  months_active: "Time in business",
  avg_daily_txns: "Daily sales count",
  profit_margin_pct: "Profit margin",
  total_revenue: "Total revenue",
  outstanding_debt: "Outstanding debt",
  recent_growth: "Recent growth",
  seasonality: "Seasonal demand",
  price_trend: "Price trend",
  stock_level: "Current stock",
  transaction_amount: "Transaction size",
  transaction_time: "Time of transaction",
  location_change: "Unusual location",
};

const humanize = (f) =>
  FEATURE_LABELS[f] ||
  String(f)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/* -------------------------------------------------------------------------- */
/*  Redesigned Loan Readiness Gauge                                           */
/* -------------------------------------------------------------------------- */

function LoanReadinessGauge({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const strokeDashoffset = 251.2 - (251.2 * pct) / 100;

  const strokeColor =
    pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#f43f5e";

  const colorClass =
    pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          className="stroke-slate-200 dark:stroke-slate-800"
          strokeWidth="8"
          fill="transparent"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray="251.2"
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`font-outfit text-2xl font-black ${colorClass}`}>
          {pct.toFixed(0)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Score
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  "What's affecting this" — diverging bar chart                              */
/* -------------------------------------------------------------------------- */

function InfluenceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
      <p className="font-semibold">{payload[0].payload.name}</p>
      <p className="text-[11px] opacity-90">
        {v >= 0 ? "Helping the result ↑" : "Holding it back ↓"}
      </p>
    </div>
  );
}

function InfluenceChart({ explanation }) {
  if (!explanation?.length) return null;

  const data = explanation
    .slice(0, 5)
    .map((f) => ({ name: humanize(f.feature), value: Number(f.impact) || 0 }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const max = Math.max(...data.map((d) => Math.abs(d.value)), 0.01);

  return (
    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          What's affecting this
        </p>
        <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Helping
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Holding back
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={data.length * 40 + 10}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" domain={[-max, max]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={118}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="#cbd5e1" />
          <Tooltip cursor={{ fill: "rgba(148,163,184,0.08)" }} content={<InfluenceTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={14}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.value >= 0 ? "#10b981" : "#f43f5e"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Demand trend line                                                         */
/* -------------------------------------------------------------------------- */

function DemandTrend({ history, prediction }) {
  if (!history?.length) return null;

  const data = [
    ...history.map((h) => ({ label: h.label, units: Number(h.units) })),
    { label: "Next week", units: Number(prediction), forecast: true },
  ];

  return (
    <div className="mt-2 h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            formatter={(v) => [`${v} units`, "Sales"]}
          />
          <Line type="monotone" dataKey="units" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Confidence bar                                                            */
/* -------------------------------------------------------------------------- */

function ConfidenceBar({ score }) {
  if (typeof score !== "number") return null;
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>How confident we are</span>
        <span className="font-semibold">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-slate-400 to-slate-600 transition-all duration-500 dark:from-slate-500 dark:to-slate-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const NoData = ({ reason }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
    <p className="text-sm text-slate-500 dark:text-slate-400">
      {reason || "Not enough data yet to show this."}
    </p>
  </div>
);

const CategoryChip = ({ label, tone }) => {
  const tones = {
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  };
  return <span className={`rounded-md px-2 py-1 text-xs font-bold ${tones[tone]}`}>{label}</span>;
};

/* -------------------------------------------------------------------------- */
/*  Main PredictionsDashboard Page                                            */
/* -------------------------------------------------------------------------- */

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

  if (loading) return <LoadingSpinner label="Crunching your numbers..." />;
  if (!data)
    return (
      <div className="p-6 text-center font-medium text-rose-600">
        We couldn&apos;t load your forecasts. Please try again in a moment.
      </div>
    );

  const { credit = {}, demand = {}, procurement = {}, anomaly = {} } = data;

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Your Business Forecasts"
        description="Simple predictions based on your recent activity, updated automatically. Green means something is helping you; red means it's holding you back."
      />

      {/* At-a-glance strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Loan readiness</p>
          <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
            {credit.prediction === 1 ? "✅ Ready" : "⚠️ Needs work"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Sales next week</p>
          <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
            {demand.available ? `${Number(demand.prediction).toFixed(0)} units` : "N/A"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Buying advice</p>
          <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
            {procurement.prediction === 1 ? "🛒 Buy now" : "⏳ Wait"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Account safety</p>
          <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
            {anomaly.prediction === 1 ? "🚨 Check needed" : "🛡️ All clear"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* REDESIGNED LOAN READINESS CARD */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CategoryChip label="Money" tone="teal" />
                <h3 className="font-outfit text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Loan Readiness
                </h3>
              </div>
              <span className="text-2xl">💳</span>
            </div>

            {!credit.available ? (
              <NoData reason={credit.reason} />
            ) : (
              <div className="space-y-5">
                {/* Score & Main Badge */}
                <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800/80 dark:bg-slate-800/40">
                  <LoanReadinessGauge score={credit.score} />

                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                          credit.prediction === 1
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                        }`}
                      >
                        {credit.prediction === 1 ? "✓ Ready to Apply" : "⚠️ Needs Improvement"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {credit.prediction === 1
                        ? "Your business health meets key lending criteria for loan approvals."
                        : "Boost daily sales or profit margin to increase your eligibility score."}
                    </p>
                  </div>
                </div>

                {/* Structured Key Metrics */}
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/30">
                  <div className="text-center sm:text-left px-2">
                    <p className="text-[11px] font-medium text-slate-400">In Business</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {credit.features?.months_active ?? 0} <span className="text-xs font-normal text-slate-400">mos</span>
                    </p>
                  </div>
                  <div className="border-x border-slate-200 text-center sm:text-left px-2 dark:border-slate-700/50">
                    <p className="text-[11px] font-medium text-slate-400">Daily Sales</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {credit.features?.avg_daily_txns ?? 0} <span className="text-xs font-normal text-slate-400">/day</span>
                    </p>
                  </div>
                  <div className="text-center sm:text-left px-2">
                    <p className="text-[11px] font-medium text-slate-400">Profit Margin</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {credit.features?.profit_margin_pct ?? 0}%
                    </p>
                  </div>
                </div>

                <InfluenceChart explanation={credit.explanation} />
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800" />
        </div>

        {/* SALES FORECAST */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CategoryChip label="Inventory" tone="amber" />
                <h3 className="font-outfit text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Sales Forecast
                </h3>
              </div>
              <span className="text-2xl">📈</span>
            </div>

            {!demand.available ? (
              <NoData reason={demand.reason} />
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Product: <b className="text-slate-800 dark:text-slate-200">{demand.item}</b>
                  </p>

                  <DemandTrend history={demand.history} prediction={demand.prediction} />

                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="font-outfit text-4xl font-extrabold text-amber-600 dark:text-amber-400">
                      ≈ {Number(demand.prediction).toFixed(0)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      units expected to sell next week
                    </span>
                  </div>
                </div>
                <InfluenceChart explanation={demand.explanation} />
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800" />
        </div>

        {/* BUY OR WAIT */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CategoryChip label="Purchasing" tone="orange" />
                <h3 className="font-outfit text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Buy or Wait
                </h3>
              </div>
              <span className="text-2xl">🛒</span>
            </div>

            {!procurement.available ? (
              <NoData reason={procurement.reason} />
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Product</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{procurement.item}</p>
                    </div>
                    <span
                      className={`font-outfit rounded-xl px-4 py-2 text-base font-bold ${
                        procurement.prediction === 1
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {procurement.prediction === 1 ? "Buy now" : "Wait"}
                    </span>
                  </div>
                  <ConfidenceBar score={procurement.score} />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {procurement.prediction === 1
                      ? "Prices look favourable right now — a good moment to restock."
                      : "Prices may improve soon — holding off could save you money."}
                  </p>
                </div>
                <InfluenceChart explanation={procurement.explanation} />
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800" />
        </div>

        {/* ACCOUNT ACTIVITY */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CategoryChip label="Security" tone="blue" />
                <h3 className="font-outfit text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Account Activity
                </h3>
              </div>
              <span className="text-2xl">🛡️</span>
            </div>

            {!anomaly.available ? (
              <NoData reason={anomaly.reason} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Most recent transaction</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {anomaly.customer} · {formatCurrency(anomaly.amount)}
                    </p>
                  </div>
                  <span
                    className={`font-outfit rounded-xl px-3 py-1.5 text-sm font-bold ${
                      anomaly.prediction === 1
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {anomaly.prediction === 1 ? "⚠ Looks unusual" : "✓ Normal"}
                  </span>
                </div>
                {anomaly.prediction === 1 && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    This transaction looks different from your usual pattern — worth a quick check.
                  </p>
                )}
                <InfluenceChart explanation={anomaly.explanation} />
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800" />
        </div>
      </div>
    </div>
  );
}