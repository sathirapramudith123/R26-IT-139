"use client";
import { useEffect, useState } from "react";
import { ListChecks, TrendingUp } from "lucide-react";
import { insightsApi } from "@/services/api/insights";
import { humanize } from "@/components/predictions/InsightWidgets";
import { t } from "@/lib/i18n";

// Plain-language advice for the measures that pull a credit score down (SHAP feature names)
const TIPS = {
  stockout_rate: () => t("Running out of stock lowers your score — reorder popular items earlier."),
  digital_payment_ratio: () => t("Card, QR and bank payments build a record that banks trust."),
  digital_revenue_volume: () => t("Card, QR and bank payments build a record that banks trust."),
  sales_volatility: () => t("Very uneven daily sales look risky — steadier sales help."),
  avg_daily_txns: () => t("Record every sale — more sales per day lifts the score."),
  profit_margin_pct: () => t("A thin margin hurts — check your prices and cut waste."),
  cash_flow_margin: () => t("A thin margin hurts — check your prices and cut waste."),
  monthly_expenses_rs: () => t("High monthly expenses eat your profit — look for costs to cut."),
  monthly_profit_rs: () => t("More monthly profit means you can repay a loan more easily."),
  net_cash_flow: () => t("More monthly profit means you can repay a loan more easily."),
  monthly_revenue_rs: () => t("Higher monthly sales show the business can carry a loan."),
  revenue_per_active_month: () => t("Higher monthly sales show the business can carry a loan."),
  months_active: () => t("Time in business counts — keep recording, the score grows with your history."),
  debt_to_income_ratio: () => t("Paying down existing debt improves your score."),
};

// Two parts: why the score is what it is (from the model's explanation), and what to do about it
// (each step scored by the model, so the "+ points" are real model output, not a guess).
export default function ActionPlan({ explanation }) {
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    insightsApi
      .creditActions()
      .then(setPlan)
      .catch(() => setPlan({ actions: [] }));
  }, []);

  const holdingBack = (explanation || [])
    .filter((f) => Number(f.impact) < 0)
    .sort((a, b) => Number(a.impact) - Number(b.impact))
    .slice(0, 3);

  return (
    <div className="card p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
        <ListChecks className="h-5 w-5 text-brand-600" /> {t("Your action plan")}
      </h3>
      <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
        {t("What is holding your credit score back, and the steps that would raise it most.")}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* why */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-500">
            {t("Holding you back")}
          </p>
          {holdingBack.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("Nothing is pulling your score down much right now. 👏")}
            </p>
          ) : (
            <ul className="space-y-2">
              {holdingBack.map((f) => (
                <li key={f.feature} className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/40">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {humanize(f.feature)}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {(TIPS[f.feature] || (() => t("This measure is lowering your score.")))()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* what to do */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
            {t("Do this next")}
          </p>
          {!plan ? (
            <p className="text-sm text-slate-400">{t("Calculating...")}</p>
          ) : plan.actions?.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("No single step would raise your score much — keep recording sales and stock.")}
            </p>
          ) : (
            <ol className="space-y-2">
              {plan.actions.map((a, i) => (
                <li
                  key={a.key}
                  className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                    {t(a.title)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300">
                    <TrendingUp className="h-3.5 w-3.5" /> +{a.delta}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {plan?.actions?.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-400">
              {t("Points = how much the AI model's score rises if you make that one change.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
