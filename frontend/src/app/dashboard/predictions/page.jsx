"use client";

import { useEffect, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
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

import { t } from "@/lib/i18n";
export default function PredictionsDashboard() {
  useAuthGuard();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllItems, setShowAllItems] = useState(false);
  const [showAllProcurement, setShowAllProcurement] = useState(false);

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

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("Your Business Forecasts")}
        description={t(
          "Simple predictions based on your recent activity, updated automatically. Green means something is helping you; red means it's holding you back.",
        )}
      />

      {/* At-a-glance strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">{t("Credit Score")}</p>
          <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
            {creditApproved ? t("✅ Ready") : t("⚠️ Needs work")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">{t("Sales next week")}</p>
          <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
            {demand.available && demand.items?.length
              ? `${demand.items.reduce((s, it) => s + Number(it.forecast_units || 0), 0).toFixed(0)} ${t("units")}`
              : t("N/A")}
          </p>
          {demand.available && demand.items?.some((it) => it.forecast_revenue != null) && (
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              {t("≈ Rs")}{" "}
              {demand.items
                .reduce((s, it) => s + Number(it.forecast_revenue || 0), 0)
                .toLocaleString("en-LK")}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">{t("To restock")}</p>
          <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
            {procurement.available && procurement.items?.length
              ? `🛒 ${procurement.items.filter((it) => it.action === "BUY").length} ${t("items")}`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">{t("Account safety")}</p>
          <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
            {anomaly.prediction === 1 ? t("🚨 Check needed") : t("🛡️ All clear")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* REDESIGNED LOAN READINESS CARD */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CategoryChip label={t("Money")} tone="teal" />
                <h3 className="font-outfit text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {t("Credit Score")}
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
                  <LoanReadinessGauge score={creditScore} />

                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                          creditApproved
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                        }`}
                      >
                        {creditApproved ? t("✓ Ready to Apply") : t("⚠️ Needs Improvement")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {creditApproved
                        ? credit.max_loan_limit_lkr
                          ? `${t("Your business health meets key lending criteria — up to")} ${formatCurrency(credit.max_loan_limit_lkr)}.`
                          : t("Your business health meets key lending criteria for loan approvals.")
                        : t("Boost daily sales or profit margin to increase your eligibility score.")}
                    </p>
                  </div>
                </div>

                {/* Structured Key Metrics */}
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/30">
                  <div className="text-center sm:text-left px-2">
                    <p className="text-[11px] font-medium text-slate-400">{t("In Business")}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {credit.features?.months_active ?? 0}{" "}
                      <span className="text-xs font-normal text-slate-400">{t("mos")}</span>
                    </p>
                  </div>
                  <div className="border-x border-slate-200 text-center sm:text-left px-2 dark:border-slate-700/50">
                    <p className="text-[11px] font-medium text-slate-400">{t("Daily Sales")}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {credit.features?.avg_daily_txns ?? 0}{" "}
                      <span className="text-xs font-normal text-slate-400">{t("/day")}</span>
                    </p>
                  </div>
                  <div className="text-center sm:text-left px-2">
                    <p className="text-[11px] font-medium text-slate-400">{t("Profit Margin")}</p>
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
                <CategoryChip label={t("Inventory")} tone="amber" />
                <h3 className="font-outfit text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {t("Sales Forecast")}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAllItems(true)}
                  className="text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400"
                >
                  {t("View all items →")}
                </button>
                <span className="text-2xl">📈</span>
              </div>
            </div>

            {!demand.available ? (
              <NoData reason={demand.reason} />
            ) : (
              <div className="space-y-2">
                {(demand.items || []).map((it, i) => {
                  // highlight items below their reorder level
                  const needsReorder = Number(it.quantity) < Number(it.reorder_level);
                  // items with no recent sales have no forecast (available: false)
                  const noHistory = it.available === false;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/20"
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
                      <div className="text-right">
                        {noHistory ? (
                          <span className="text-xs italic text-slate-400">{t("No sales data yet")}</span>
                        ) : (
                          <>
                            <span className="font-outfit text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                              ≈ {it.forecast_units != null ? Number(it.forecast_units).toFixed(0) : "—"}
                            </span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {t("units / next week")}
                            </p>
                            {it.forecast_revenue != null && (
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {t("≈ Rs")} {Number(it.forecast_revenue).toLocaleString("en-LK")}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                <CategoryChip label={t("Purchasing")} tone="orange" />
                <h3 className="font-outfit text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {t("Should I Buy?")}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAllProcurement(true)}
                  className="text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
                >
                  {t("View all items →")}
                </button>
                <span className="text-2xl">🛒</span>
              </div>
            </div>

            {!procurement.available ? (
              <NoData reason={procurement.reason} />
            ) : (
              <div className="space-y-2">
                {(procurement.items || []).map((it, i) => {
                  const buy = it.action === "BUY";
                  return (
                    <div key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
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
                          className={`font-outfit rounded-xl px-3 py-1.5 text-sm font-bold ${
                            buy
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {buy ? t("🛒 Buy") : t("⏳ Wait")}
                        </span>
                      </div>
                      {it.price_context && (
                        <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {buy ? t("Stock low — restock needed.") : t("Enough stock.")}
                          <span className="italic">{t(it.price_context)}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
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
                <CategoryChip label={t("Security")} tone="blue" />
                <h3 className="font-outfit text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {t("Account Activity")}
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
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("Most recent transaction")}
                    </p>
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
                    {anomaly.prediction === 1 ? t("⚠ Looks unusual") : t("✓ Normal")}
                  </span>
                </div>
                {anomaly.prediction === 1 && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {t("This transaction looks different from your usual pattern — worth a quick check.")}
                  </p>
                )}
                <InfluenceChart explanation={anomaly.explanation} />
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800" />
        </div>
      </div>

      <SalesSummaryModal open={showAllItems} onClose={() => setShowAllItems(false)} />
      <ProcurementSummaryModal open={showAllProcurement} onClose={() => setShowAllProcurement(false)} />
    </div>
  );
}
