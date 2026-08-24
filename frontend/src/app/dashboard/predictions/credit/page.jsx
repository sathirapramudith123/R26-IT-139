"use client";

import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import PredictionResult from "@/components/predictions/PredictionResult";
import usePrediction from "@/hooks/usePrediction";

// ML Model එක බලාපොරොත්තු වන නිවැරදි Features 14
const CREDIT_FIELDS = [
  { name: "months_active", label: "Months Active in Business", type: "number", default: 24 },
  { name: "monthly_revenue_rs", label: "Monthly Revenue (LKR)", type: "number", default: 450000 },
  { name: "monthly_expenses_rs", label: "Monthly Expenses (LKR)", type: "number", default: 280000 },
  { name: "monthly_profit_rs", label: "Monthly Profit (LKR)", type: "number", default: 170000 },
  { name: "profit_margin_pct", label: "Profit Margin (%)", type: "number", default: 37.7 },
  { name: "avg_daily_txns", label: "Average Daily Transactions", type: "number", default: 45 },
  { name: "sales_volatility", label: "Sales Volatility Index", type: "number", default: 0.15 },
  { name: "credit_sales_ratio", label: "Credit Sales Ratio (0 - 1)", type: "number", default: 0.25 },
  { name: "digital_payment_ratio", label: "Digital Payment Ratio (0 - 1)", type: "number", default: 0.60 },
  { name: "stockout_rate", label: "Stockout Rate (0 - 1)", type: "number", default: 0.05 },
  { name: "net_cash_flow", label: "Net Cash Flow (LKR)", type: "number", default: 120000 },
  { name: "debt_to_income_ratio", label: "Debt-to-Income Ratio", type: "number", default: 0.20 },
  { name: "digital_revenue_volume", label: "Digital Revenue Volume (LKR)", type: "number", default: 270000 },
  { name: "revenue_per_active_month", label: "Revenue per Active Month (LKR)", type: "number", default: 18750 },
];

export default function CreditReadinessPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();

  const handleSubmit = async (formData) => {
    try {
      // FastAPI හි 'credit' model එකට සම්බන්ධ වේ
      await run("credit", formData);
    } catch (err) {
      // Error handled inside usePrediction
    }
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Credit Readiness Assessment"
        description="Check loan eligibility and financial risk profile."
        action={
          <Link href="/dashboard/predictions">
            <Button variant="secondary">← All Models</Button>
          </Link>
        }
      />

      <div className="space-y-6">
        <PredictionForm
          fields={CREDIT_FIELDS}
          loading={loading}
          onSubmit={handleSubmit}
        />

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