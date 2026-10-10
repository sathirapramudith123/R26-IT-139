"use client";

import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import PredictionResult from "@/components/predictions/PredictionResult";
import usePrediction from "@/hooks/usePrediction";

import { t } from "@/lib/i18n";
// Inputs expected by the credit model
const CREDIT_FIELDS = [
  {
    name: "months_active",
    get label() {
      return t("Months Active in Business");
    },
    type: "number",
    default: 24,
  },
  {
    name: "monthly_revenue_rs",
    get label() {
      return t("Monthly Revenue (LKR)");
    },
    type: "number",
    default: 450000,
  },
  {
    name: "monthly_expenses_rs",
    get label() {
      return t("Monthly Expenses (LKR)");
    },
    type: "number",
    default: 280000,
  },
  {
    name: "monthly_profit_rs",
    get label() {
      return t("Monthly Profit (LKR)");
    },
    type: "number",
    default: 170000,
  },
  {
    name: "profit_margin_pct",
    get label() {
      return t("Profit Margin (%)");
    },
    type: "number",
    default: 37.7,
  },
  {
    name: "avg_daily_txns",
    get label() {
      return t("Average Daily Transactions");
    },
    type: "number",
    default: 45,
  },
  {
    name: "sales_volatility",
    get label() {
      return t("Sales Volatility Index");
    },
    type: "number",
    default: 0.15,
  },
  {
    name: "credit_sales_ratio",
    get label() {
      return t("Credit Sales Ratio (0 - 1)");
    },
    type: "number",
    default: 0.25,
  },
  {
    name: "digital_payment_ratio",
    get label() {
      return t("Digital Payment Ratio (0 - 1)");
    },
    type: "number",
    default: 0.6,
  },
  {
    name: "stockout_rate",
    get label() {
      return t("Stockout Rate (0 - 1)");
    },
    type: "number",
    default: 0.05,
  },
  {
    name: "net_cash_flow",
    get label() {
      return t("Net Cash Flow (LKR)");
    },
    type: "number",
    default: 120000,
  },
  {
    name: "debt_to_income_ratio",
    get label() {
      return t("Debt-to-Income Ratio");
    },
    type: "number",
    default: 0.2,
  },
  {
    name: "digital_revenue_volume",
    get label() {
      return t("Digital Revenue Volume (LKR)");
    },
    type: "number",
    default: 270000,
  },
  {
    name: "revenue_per_active_month",
    get label() {
      return t("Revenue per Active Month (LKR)");
    },
    type: "number",
    default: 18750,
  },
];

export default function CreditReadinessPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();

  const handleSubmit = async (formData) => {
    try {
      // calls the 'credit' model in the ML service
      await run("credit", formData);
    } catch (err) {
      // Error handled inside usePrediction
    }
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("Credit Readiness Assessment")}
        description={t("Check loan eligibility and financial risk profile.")}
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

        {result && (
          <PredictionResult
            result={result}
            positiveLabel="Eligible (Low Risk)"
            negativeLabel="Not Eligible (High Risk)"
            scoreLabel="Readiness Score"
          />
        )}
      </div>
    </div>
  );
}
