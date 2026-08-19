"use client";

import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import PredictionResult from "@/components/predictions/PredictionResult";
import usePrediction from "@/hooks/usePrediction";

// ML Model එක බලාපොරොත්තු වන නිවැරදි Features 15
const PROCUREMENT_FIELDS = [
  { name: "item", label: "Item Name", type: "text", default: "Rice" },
  { name: "category", label: "Category", type: "text", default: "grain" },
  { name: "iso_year", label: "ISO Year", type: "number", default: 2026 },
  { name: "iso_week", label: "ISO Week", type: "number", default: 12 },
  { name: "days_to_avurudu", label: "Days to Avurudu", type: "number", default: 30 },
  { name: "festival_season", label: "Festival Season (1 = Yes, 0 = No)", type: "number", default: 0 },
  { name: "avg_wholesale_price_rs", label: "Avg Wholesale Price (LKR)", type: "number", default: 180 },
  { name: "avg_retail_price_rs", label: "Avg Retail Price (LKR)", type: "number", default: 220 },
  { name: "lag1_price", label: "Lag 1 Price (LKR)", type: "number", default: 215 },
  { name: "lag4_price", label: "Lag 4 Price (LKR)", type: "number", default: 200 },
  { name: "rolling4_mean_price", label: "Rolling 4-Week Mean Price (LKR)", type: "number", default: 210 },
  { name: "lag1_units", label: "Lag 1 Units Sold", type: "number", default: 150 },
  { name: "lag4_units", label: "Lag 4 Units Sold", type: "number", default: 120 },
  { name: "rolling4_mean_units", label: "Rolling 4-Week Mean Units", type: "number", default: 135 },
  { name: "weekend_share", label: "Weekend Sales Share (0 - 1)", type: "number", default: 0.35 },
];

export default function ProcurementOptimizerPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();

  const handleSubmit = async (formData) => {
    try {
      // FastAPI හි 'demand' model එකට සම්බන්ධ වේ
      await run("demand", formData);
    } catch (err) {
      // Error handled inside usePrediction
    }
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Procurement Optimizer"
        description="Smart stock replenishment decision engine (Buy Now vs. Wait)."
        action={
          <Link href="/dashboard/predictions">
            <Button variant="secondary">← All Models</Button>
          </Link>
        }
      />

      <div className="space-y-6">
        <PredictionForm
          fields={PROCUREMENT_FIELDS}
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
            positiveLabel="Buy Now (Recommended)"
            negativeLabel="Wait (Prices may drop / low demand)"
            scoreLabel="Buy Confidence"
          />
        )}
      </div>
    </div>
  );
}