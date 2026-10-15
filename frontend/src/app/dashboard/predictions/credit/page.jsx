"use client";

import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import { LoanReadinessGauge, InfluenceChart } from "@/components/predictions/InsightWidgets";
import usePrediction from "@/hooks/usePrediction";
import { formatCurrency } from "@/lib/formatters";

import { t } from "@/lib/i18n";

// Inputs of the credit model. Defaults: a shop scoring about 60 (conditional approval), so a
// change can move the score either way. Profit and margin are worked out from sales and expenses
// on submit, and the model derives net cash flow, debt-to-income etc. itself.
const field = (name, label, def, hint) => ({
  name,
  get label() {
    return t(label);
  },
  type: "number",
  default: def,
  ...(hint && {
    get hint() {
      return t(hint);
    },
  }),
});

const CREDIT_FIELDS = [
  field("months_active", "Months in business", 12, "Below 3 months is rejected by the bank rule"),
  field("monthly_revenue_rs", "Monthly sales (LKR)", 300000),
  field(
    "monthly_expenses_rs",
    "Monthly expenses (LKR)",
    210000,
    "Above 85% of sales is rejected by the bank rule",
  ),
  field("avg_daily_txns", "Sales per day", 40),
  field("digital_payment_ratio", "Paid digitally (0–1)", 0.4, "0.4 = 40% of payments are digital"),
  field("stockout_rate", "Items out of stock (0–1)", 0.1, "Above 0.25 lowers the score a lot"),
  field(
    "sales_volatility",
    "Sales volatility (0.1–5)",
    1.0,
    "How much sales go up and down (training scale 0.1–5)",
  ),
  field("credit_sales_ratio", "Credit sales (0–1)", 0.2, "Share of sales given on credit"),
];

const STATUS = {
  APPROVED_PRIME: ["Approved", "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"],
  APPROVED_CONDITIONAL: [
    "Conditional approval",
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ],
};

function CreditResult({ result }) {
  const score = Number(result.credit_score ?? 0);
  const [label, cls] = STATUS[result.status] || [
    "Not approved",
    "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  ];
  const alerts = (result.rule_alerts || []).filter((a) => a && a !== "None");
  return (
    <div className="card space-y-5 p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <LoanReadinessGauge score={score} />
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${cls}`}>
            {t(label)}
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("Loan limit")}: <b>{formatCurrency(result.max_loan_limit_lkr || 0)}</b>
          </p>
          {result.loan_limit_basis && <p className="text-xs text-slate-500">{result.loan_limit_basis}</p>}
          {alerts.map((a) => (
            <p
              key={a}
              className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            >
              {t(a)}
            </p>
          ))}
        </div>
      </div>
      {Array.isArray(result.explanation) && result.explanation.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("What's affecting this")}
          </p>
          <InfluenceChart explanation={result.explanation} />
        </div>
      )}
    </div>
  );
}

export default function CreditReadinessPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();

  const handleSubmit = async (f) => {
    const revenue = Number(f.monthly_revenue_rs) || 0;
    const profit = revenue - (Number(f.monthly_expenses_rs) || 0);
    try {
      await run("credit", {
        ...f,
        monthly_profit_rs: profit,
        profit_margin_pct: revenue ? +((profit / revenue) * 100).toFixed(2) : 0,
      });
    } catch {
      // shown through `error`
    }
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("Credit Readiness Assessment")}
        description={t("Change one value at a time and see how the credit score moves.")}
        action={
          <Link href="/dashboard/predictions">
            <Button variant="secondary">{t("← All Models")}</Button>
          </Link>
        }
      />

      <div className="space-y-6">
        <PredictionForm fields={CREDIT_FIELDS} loading={loading} onSubmit={handleSubmit} />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            {typeof error === "object" ? JSON.stringify(error) : error}
          </div>
        )}

        {result && <CreditResult result={result} />}
      </div>
    </div>
  );
}
