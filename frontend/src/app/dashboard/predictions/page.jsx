"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import useAuthGuard from "@/hooks/useAuthGuard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { insightsApi } from "@/services/api/insights";
import { formatCurrency } from "@/lib/formatters";
import {
  LoanReadinessGauge,
  InfluenceChart,
  NoData,
  CategoryChip,
} from "@/components/predictions/InsightWidgets";
import { SalesSummaryModal, ProcurementSummaryModal } from "@/components/predictions/SummaryModals";
import WhatIfSimulator from "@/components/predictions/WhatIfSimulator";
import ActionPlan from "@/components/predictions/ActionPlan";
import ForecastChart from "@/components/predictions/ForecastChart";
import { TrustLine, ModelTrustPanel } from "@/components/predictions/ModelTrust";

import { t } from "@/lib/i18n";

export default function PredictionsDashboard() {
  useAuthGuard();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllItems, setShowAllItems] = useState(false);
  const [showAllProcurement, setShowAllProcurement] = useState(false);
  const [openItem, setOpenItem] = useState(0); // forecast row whose chart is open

  useEffect(() => {
    insightsApi
      .get()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label={t("Crunching your numbers...")} />;
  if (!data)
    return (
      <div className="p-6 text-center font-medium text-rose-600">
        {t("We couldn't load your forecasts. Please try again in a moment.")}
      </div>
    );

  const { credit = {}, demand = {}, procurement = {}, anomaly = {} } = data;

  const creditScore = Number(credit.credit_score ?? credit.score ?? 0);
  const creditApproved = String(credit.status || "").startsWith("APPROVED");
  const weekUnits = demand.available
    ? (demand.items || []).reduce((s, it) => s + Number(it.forecast_units || 0), 0)
    : null;
  const weekRevenue = demand.available
    ? (demand.items || []).reduce((s, it) => s + Number(it.forecast_revenue || 0), 0)
    : 0;
  const toBuy = procurement.available
    ? (procurement.items || []).filter((it) => it.action === "BUY").length
    : null;
  const unusual = anomaly.prediction === 1;

  const glance = [
    {
      label: t("Credit Score"),
      value: credit.available ? `${creditScore.toFixed(0)}/100` : "—",
      sub: creditApproved ? t("✅ Ready") : t("⚠️ Needs work"),
      good: creditApproved,
    },
    {
      label: t("Sales next week"),
      value: weekUnits != null ? `${weekUnits.toFixed(0)} ${t("units")}` : t("N/A"),
      sub: weekRevenue ? `${t("≈ Rs")} ${weekRevenue.toLocaleString("en-LK")}` : "",
      good: true,
    },
    {
      label: t("To restock"),
      value: toBuy != null ? `${toBuy} ${t("items")}` : "—",
      sub: toBuy ? t("🛒 Buy") : t("✓ Adequate"),
      good: !toBuy,
    },
    {
      label: t("Account safety"),
      value: anomaly.available ? (unusual ? t("🚨 Check needed") : t("🛡️ All clear")) : "—",
      sub: "",
      good: !unusual,
    },
  ];

  return (
    <div className="page-container space-y-6">
      {/* ===== Business health hero ===== */}
      <div className="relative overflow-hidden rounded-3xl gradient-brand p-6 text-white shadow-elevated sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-40 h-44 w-44 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-5">
            {credit.available && (
              <div className="rounded-full bg-white p-1.5 shadow-lg">
                <LoanReadinessGauge score={creditScore} />
              </div>
            )}
            <div>
              <p className="text-sm text-white/75">{t("AI insights")}</p>
              <h1 className="font-display text-2xl font-semibold sm:text-3xl">
                {t("Your Business Forecasts")}
              </h1>
              <p className="mt-1 max-w-md text-xs text-white/75">
                {t(
                  "Four AI models read your records. Every result shows why — and what you can do about it.",
                )}
              </p>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 lg:ml-auto lg:max-w-xl">
            {glance.map((g) => (
              <div key={g.label} className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
                <p className="text-[11px] text-white/75">{g.label}</p>
                <p className="font-display text-lg font-semibold leading-tight">{g.value}</p>
                {g.sub && (
                  <p className={`text-[11px] font-medium ${g.good ? "text-emerald-200" : "text-amber-200"}`}>
                    {g.sub}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Credit + What-if ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card flex flex-col p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CategoryChip label={t("Money")} tone="brand" />
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t("Credit Score")}
              </h3>
            </div>
            <span className="text-2xl">💳</span>
          </div>

          {!credit.available ? (
            <NoData reason={credit.reason} />
          ) : (
            <div className="flex-1 space-y-5">
              <div className="flex flex-col items-center gap-5 rounded-2xl bg-slate-50 p-5 sm:flex-row dark:bg-slate-800/40">
                <LoanReadinessGauge score={creditScore} />
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      creditApproved
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                    }`}
                  >
                    {creditApproved ? t("✓ Ready to Apply") : t("⚠️ Needs Improvement")}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {creditApproved
                      ? credit.max_loan_limit_lkr
                        ? `${t("Your business health meets key lending criteria — up to")} ${formatCurrency(credit.max_loan_limit_lkr)}.`
                        : t("Your business health meets key lending criteria for loan approvals.")
                      : t("Boost daily sales or profit margin to increase your eligibility score.")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/30">
                {[
                  [t("In Business"), `${credit.features?.months_active ?? 0}`, t("mos")],
                  [t("Daily Sales"), `${credit.features?.avg_daily_txns ?? 0}`, t("/day")],
                  [t("Profit Margin"), `${credit.features?.profit_margin_pct ?? 0}%`, ""],
                ].map(([label, value, unit]) => (
                  <div key={label} className="px-2 text-center sm:text-left">
                    <p className="text-[11px] font-medium text-slate-400">{label}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {value} <span className="text-xs font-normal text-slate-400">{unit}</span>
                    </p>
                  </div>
                ))}
              </div>

              <InfluenceChart explanation={credit.explanation} />
            </div>
          )}
          <TrustLine model="credit" />
        </div>

        {credit.available ? (
          <WhatIfSimulator
            features={credit.features}
            baseScore={creditScore}
            baseStatus={credit.status}
            baseLimit={credit.max_loan_limit_lkr}
          />
        ) : (
          <div className="card flex items-center justify-center p-6 text-sm text-slate-400">
            {t("Record some transactions to try the what-if simulator.")}
          </div>
        )}
      </div>

      {credit.available && <ActionPlan explanation={credit.explanation} />}

      {/* ===== Forecast + Buy/Wait ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card flex flex-col p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CategoryChip label={t("Inventory")} tone="amber" />
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t("Sales Forecast")}
              </h3>
            </div>
            <button
              onClick={() => setShowAllItems(true)}
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              {t("View all items →")}
            </button>
          </div>

          {!demand.available ? (
            <NoData reason={demand.reason} />
          ) : (
            <div className="flex-1 space-y-2">
              {(demand.items || []).map((it, i) => {
                const needsReorder = Number(it.quantity) < Number(it.reorder_level);
                const noHistory = it.available === false;
                const open = openItem === i && !noHistory;
                return (
                  <div key={i} className="rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                    <button
                      type="button"
                      disabled={noHistory}
                      onClick={() => setOpenItem(open ? null : i)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{it.item}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t("Stock:")} {it.quantity} {t("· Reorder:")} {it.reorder_level}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            needsReorder
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {needsReorder ? t("🚩 Reorder now") : t("✓ Adequate")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        {noHistory ? (
                          <span className="text-xs italic text-slate-400">{t("No sales data yet")}</span>
                        ) : (
                          <div>
                            <span className="font-display text-2xl font-bold text-brand-600 dark:text-brand-400">
                              ≈ {Number(it.forecast_units).toFixed(0)}
                            </span>
                            <p className="text-[10px] text-slate-500">{t("units / next week")}</p>
                            {it.forecast_revenue != null && (
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {t("≈ Rs")} {Number(it.forecast_revenue).toLocaleString("en-LK")}
                              </p>
                            )}
                          </div>
                        )}
                        {!noHistory && (
                          <ChevronDown
                            className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
                          />
                        )}
                      </div>
                    </button>
                    {open && (
                      <div className="px-3 pb-3">
                        <ForecastChart history={it.history} forecast={it.forecast_units} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <TrustLine model="demand" />
        </div>

        <div className="card flex flex-col p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CategoryChip label={t("Purchasing")} tone="orange" />
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t("Should I Buy?")}
              </h3>
            </div>
            <button
              onClick={() => setShowAllProcurement(true)}
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              {t("View all items →")}
            </button>
          </div>

          {!procurement.available ? (
            <NoData reason={procurement.reason} />
          ) : (
            <div className="flex-1 space-y-2">
              {(procurement.items || []).map((it, i) => {
                const buy = it.action === "BUY";
                return (
                  <div key={i} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{it.item}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t("Stock:")} {it.quantity} {t("· Reorder:")}{" "}
                          {it.forecast_reorder_level ?? it.reorder_level}
                          {it.decision_basis === "forecast" &&
                            ` (≈${Math.round(it.forecast_units)}${t("/week forecast")})`}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                          buy
                            ? "bg-accent text-white shadow-md shadow-emerald-500/25"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {buy ? t("🛒 Buy") : t("⏳ Wait")}
                      </span>
                    </div>
                    {it.price_context && (
                      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {buy ? t("Stock low — restock needed.") : t("Enough stock.")}{" "}
                        <span className="italic">{t(it.price_context)}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <TrustLine model="procurement" />
        </div>
      </div>

      {/* ===== Account activity ===== */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CategoryChip label={t("Security")} tone="blue" />
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t("Account Activity")}
            </h3>
          </div>
          <span className="text-2xl">🛡️</span>
        </div>
        {!anomaly.available ? (
          <NoData reason={anomaly.reason} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("Most recent transaction")}</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {anomaly.customer} · {formatCurrency(anomaly.amount)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                    unusual
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  }`}
                >
                  {unusual ? t("⚠ Looks unusual") : t("✓ Normal")}
                </span>
              </div>
              {unusual && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {t("This transaction looks different from your usual pattern — worth a quick check.")}
                </p>
              )}
            </div>
            <InfluenceChart explanation={anomaly.explanation} />
          </div>
        )}
        <TrustLine model="anomaly" />
      </div>

      <ModelTrustPanel />

      <SalesSummaryModal open={showAllItems} onClose={() => setShowAllItems(false)} />
      <ProcurementSummaryModal open={showAllProcurement} onClose={() => setShowAllProcurement(false)} />
    </div>
  );
}
