"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import PredictionResult from "@/components/predictions/PredictionResult";
import usePrediction from "@/hooks/usePrediction";

const FIELDS = [
  { name: "item",                  label: "Item",                   type: "text",   default: "Rice" },
  { name: "category",              label: "Category",               type: "text",   default: "grain" },
  { name: "iso_year",              label: "ISO Year",               type: "number", default: 2025 },
  { name: "iso_week",              label: "ISO Week",               type: "number", default: 26 },
  { name: "days_to_avurudu",       label: "Days to Avurudu",        type: "number", default: 120 },
  { name: "festival_season",       label: "Festival Season (0/1)",  type: "number", default: 0 },
  { name: "avg_wholesale_price_rs",label: "Avg Wholesale Price",    type: "number", default: 200 },
  { name: "avg_retail_price_rs",   label: "Avg Retail Price",       type: "number", default: 240 },
  { name: "lag1_units",            label: "Lag 1 Units",            type: "number", default: 80 },
  { name: "lag4_units",            label: "Lag 4 Units",            type: "number", default: 75 },
  { name: "rolling4_mean_units",   label: "Rolling 4-wk Mean Units",type: "number", default: 78 },
  { name: "weekend_share",         label: "Weekend Share",          type: "number", default: 0.3 },
];

export default function DemandPredictionPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();
  return (
    <div className="page-container">
      <PageHeader title="Demand Forecast" description="Component 2 — predict units of demand for an item."
        action={<Link href="/dashboard/predictions"><Button variant="secondary">← All Models</Button></Link>} />
      <PredictionForm fields={FIELDS} loading={loading} onSubmit={f => run("demand", f).catch(() => {})} />
      {error && <div className="max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <PredictionResult result={result} />
    </div>
  );
}