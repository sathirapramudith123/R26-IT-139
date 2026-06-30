"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import PredictionResult from "@/components/predictions/PredictionResult";
import usePrediction from "@/hooks/usePrediction";

const FIELDS = [
  { name: "item",                 label: "Item",                  type: "text",   default: "Rice" },
  { name: "category",             label: "Category",              type: "text",   default: "grain" },
  { name: "iso_year",             label: "ISO Year",              type: "number", default: 2025 },
  { name: "iso_week",             label: "ISO Week",              type: "number", default: 26 },
  { name: "current_price_rs",     label: "Current Price (LKR)",   type: "number", default: 200 },
  { name: "price_change_4wk_pct", label: "Price Change 4wk (%)",  type: "number", default: 2.5 },
  { name: "price_vs_3mo_avg_pct", label: "Price vs 3mo Avg (%)",  type: "number", default: 1.2 },
  { name: "days_to_festival",     label: "Days to Festival",      type: "number", default: 120 },
  { name: "festival_season",      label: "Festival Season (0/1)", type: "number", default: 0 },
];

export default function ProcurementPredictionPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();
  return (
    <div className="page-container">
      <PageHeader title="Buy Now or Wait" description="Component 3 — decide whether to buy now."
        action={<Link href="/dashboard/predictions"><Button variant="secondary">← All Models</Button></Link>} />
      <PredictionForm fields={FIELDS} loading={loading} onSubmit={f => run("procurement", f).catch(() => {})} />
      {error && <div className="max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <PredictionResult result={result} positiveLabel="Buy now" negativeLabel="Wait" scoreLabel="Buy-now confidence" />
    </div>
  );
}