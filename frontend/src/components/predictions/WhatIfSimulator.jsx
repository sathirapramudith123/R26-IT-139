"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { insightsApi } from "@/services/api/insights";
import { formatCurrency } from "@/lib/formatters";
import { t } from "@/lib/i18n";

// The shop measures a merchant can change, with slider ranges around today's value
const FIELDS = [
  {
    key: "monthly_revenue_rs",
    get label() {
      return t("Monthly sales (LKR)");
    },
    range: (v) => [0, Math.max(50000, Math.round(v * 2.5))],
    step: 1000,
    fmt: (v) => formatCurrency(v),
  },
  {
    key: "monthly_expenses_rs",
    get label() {
      return t("Monthly expenses (LKR)");
    },
    range: (v) => [0, Math.max(50000, Math.round(v * 2.5))],
    step: 1000,
    fmt: (v) => formatCurrency(v),
  },
  {
    key: "avg_daily_txns",
    get label() {
      return t("Sales per day");
    },
    range: (v) => [0, Math.max(10, Math.ceil(v * 3))],
    step: 0.5,
    fmt: (v) => Number(v).toFixed(1),
  },
  {
    key: "digital_payment_ratio",
    get label() {
      return t("Paid digitally");
    },
    range: () => [0, 1],
    step: 0.05,
    fmt: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "stockout_rate",
    get label() {
      return t("Items out of stock");
    },
    range: () => [0, 1],
    step: 0.05,
    fmt: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "months_active",
    get label() {
      return t("Months in business");
    },
    range: (v) => [1, Math.max(36, v + 12)],
    step: 1,
    fmt: (v) => `${v}`,
  },
];

const STATUS = {
  APPROVED_PRIME: {
    get label() {
      return t("✓ Ready to Apply");
    },
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  APPROVED_CONDITIONAL: {
    get label() {
      return t("Conditional approval");
    },
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
};
const statusChip = (s) =>
  STATUS[s] || {
    label: t("⚠️ Needs Improvement"),
    cls: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  };

// "What if I sold more / kept items in stock…?" — re-scores the shop with the ML model
export default function WhatIfSimulator({ features, baseScore, baseStatus, baseLimit }) {
  const start = useMemo(
    () => Object.fromEntries(FIELDS.map((f) => [f.key, Number(features?.[f.key] ?? 0)])),
    [features],
  );
  const [values, setValues] = useState(start);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  const changed = FIELDS.some((f) => values[f.key] !== start[f.key]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!changed) {
      setResult(null);
      return;
    }
    timer.current = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        setResult(await insightsApi.creditWhatIf(values));
      } catch (e) {
        setError(e.message || t("Something went wrong. Please try again."));
      } finally {
        setBusy(false);
      }
    }, 450);
    return () => clearTimeout(timer.current);
  }, [values, changed]);

  const score = result ? result.scenario.credit_score : baseScore;
  const delta = result ? result.delta : 0;
  const status = result ? result.scenario.status : baseStatus;
  const limit = result ? result.scenario.max_loan_limit_lkr : baseLimit;
  const chip = statusChip(status);
  const profit = values.monthly_revenue_rs - values.monthly_expenses_rs;

  return (
    <div className="card flex h-full flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Sparkles className="h-5 w-5 text-brand-600" /> {t("What if…?")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t(
              "Move the sliders to see how your credit score would change. The AI model re-scores your shop.",
            )}
          </p>
        </div>
        {changed && (
          <button type="button" onClick={() => setValues(start)} className="btn-ghost !px-3 !py-1.5 !text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> {t("Reset")}
          </button>
        )}
      </div>

      {/* result */}
      <div className="flex items-center gap-4 rounded-2xl gradient-brand p-4 text-white">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-white/70">{t("Today")}</p>
          <p className="font-display text-2xl font-semibold">{Number(baseScore).toFixed(0)}</p>
        </div>
        <span className="text-xl text-white/60">→</span>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-white/70">{t("What if")}</p>
          <p className={`font-display text-4xl font-bold transition ${busy ? "opacity-50" : ""}`}>
            {Number(score).toFixed(0)}
          </p>
        </div>
        {changed && !busy && result && (
          <span
            className={`rounded-full px-2.5 py-1 text-sm font-bold ${
              delta > 0
                ? "bg-emerald-400/90 text-emerald-950"
                : delta < 0
                  ? "bg-rose-400/90 text-rose-950"
                  : "bg-white/20"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
        <div className="ml-auto text-right">
          <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${chip.cls}`}>
            {chip.label}
          </span>
          <p className="mt-1 text-[11px] text-white/80">
            {t("Loan limit")}: <b>{formatCurrency(limit || 0)}</b>
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}

      {/* sliders */}
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => {
          const [min, max] = f.range(start[f.key]);
          const moved = values[f.key] !== start[f.key];
          return (
            <label key={f.key} className="block">
              <span className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-300">{f.label}</span>
                <span
                  className={`font-semibold ${moved ? "text-brand-600 dark:text-brand-400" : "text-slate-500"}`}
                >
                  {f.fmt(values[f.key])}
                </span>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                step={f.step}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))}
                className="mt-1.5 w-full accent-brand-600"
              />
            </label>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">
        {t("Monthly profit in this scenario")}:{" "}
        <b className={profit >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatCurrency(profit)}</b>
      </p>
    </div>
  );
}
