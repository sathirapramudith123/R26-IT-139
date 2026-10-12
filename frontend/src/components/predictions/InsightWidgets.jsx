"use client";

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

import { t } from "@/lib/i18n";
export const FEATURE_LABELS = {
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

export const humanize = (f) =>
  t(
    FEATURE_LABELS[f] ||
      String(f)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
  );

export function LoanReadinessGauge({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const strokeDashoffset = 251.2 - (251.2 * pct) / 100;

  const strokeColor = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#f43f5e";

  const colorClass = pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-rose-500";

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
        <span className={`font-display text-2xl font-black ${colorClass}`}>{pct.toFixed(0)}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          {t("Score")}
        </span>
      </div>
    </div>
  );
}

export function InfluenceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
      <p className="font-semibold">{payload[0].payload.name}</p>
      <p className="text-[11px] opacity-90">{v >= 0 ? t("Helping the result ↑") : t("Holding it back ↓")}</p>
    </div>
  );
}

export function InfluenceChart({ explanation }) {
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
          {t("What's affecting this")}
        </p>
        <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("Helping")}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> {t("Holding back")}
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

export function DemandTrend({ history, prediction }) {
  if (!history?.length) return null;

  const data = [
    ...history.map((h) => ({ label: h.label, units: Number(h.units) })),
    {
      get label() {
        return t("Next week");
      },
      units: Number(prediction),
      forecast: true,
    },
  ];

  return (
    <div className="mt-2 h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              fontSize: 12,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            formatter={(v) => [`${v} ${t("units")}`, t("Sales")]}
          />
          <Line
            type="monotone"
            dataKey="units"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConfidenceBar({ score }) {
  if (typeof score !== "number") return null;
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>{t("How confident we are")}</span>
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

export const NoData = ({ reason }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
    <p className="text-sm text-slate-500 dark:text-slate-400">
      {reason || t("Not enough data yet to show this.")}
    </p>
  </div>
);

export const CategoryChip = ({ label, tone }) => {
  const tones = {
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  };
  return <span className={`rounded-md px-2 py-1 text-xs font-bold ${tones[tone]}`}>{label}</span>;
};
