"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import PredictionResult from "@/components/predictions/PredictionResult";
import usePrediction from "@/hooks/usePrediction";

const FIELDS = [
  { name: "monthly_revenue_rs",    label: "Monthly Revenue (LKR)",  type: "number", default: 450000 },
  { name: "monthly_expenses_rs",   label: "Monthly Expenses (LKR)", type: "number", default: 380000 },
  { name: "monthly_profit_rs",     label: "Monthly Profit (LKR)",   type: "number", default: 70000 },
  { name: "profit_margin_pct",     label: "Profit Margin (%)",      type: "number", default: 15.5 },
  { name: "avg_daily_txns",        label: "Avg Daily Transactions", type: "number", default: 35 },
  { name: "credit_sales_ratio",    label: "Credit Sales Ratio",     type: "number", default: 0.1 },
  { name: "digital_payment_ratio", label: "Digital Payment Ratio",  type: "number", default: 0.3 },
  { name: "sales_volatility",      label: "Sales Volatility",       type: "number", default: 0.2 },
  { name: "stockout_rate",         label: "Stockout Rate",          type: "number", default: 0.05 },
  { name: "months_active",         label: "Months Active",          type: "number", default: 18 },
];

export default function CreditPredictionPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();
  return (
    <div className="page-container">
      <PageHeader title="Credit Readiness" description="predict loan readiness from business health."
        action={<Link href="/dashboard/predictions"><Button variant="secondary">← All Models</Button></Link>} />
      <PredictionForm fields={FIELDS} loading={loading} onSubmit={f => run("credit", f).catch(() => {})} />
      {error && <div className="max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <PredictionResult result={result} positiveLabel="Credit-ready" negativeLabel="Not yet ready" scoreLabel="Credit score" />
    </div>
  );
}