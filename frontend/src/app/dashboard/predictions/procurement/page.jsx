"use client";

import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import PredictionResult from "@/components/predictions/PredictionResult";
import usePrediction from "@/hooks/usePrediction";

import { t } from "@/lib/i18n";
// Inputs for the manual prediction form
const PROCUREMENT_FIELDS = [
  {
    name: "item",
    get label() {
      return t("Item Name");
    },
    type: "text",
    default: "Rice",
  },
  {
    name: "category",
    get label() {
      return t("Category");
    },
    type: "text",
    default: "grain",
  },
  {
    name: "iso_year",
    get label() {
      return t("ISO Year");
    },
    type: "number",
    default: 2026,
  },
  {
    name: "iso_week",
    get label() {
      return t("ISO Week");
    },
    type: "number",
    default: 12,
  },
  {
    name: "days_to_avurudu",
    get label() {
      return t("Days to Avurudu");
    },
    type: "number",
    default: 30,
  },
  {
    name: "festival_season",
    get label() {
      return t("Festival Season (1 = Yes, 0 = No)");
    },
    type: "number",
    default: 0,
  },
  {
    name: "avg_wholesale_price_rs",
    get label() {
      return t("Avg Wholesale Price (LKR)");
    },
    type: "number",
    default: 180,
  },
  {
    name: "avg_retail_price_rs",
    get label() {
      return t("Avg Retail Price (LKR)");
    },
    type: "number",
    default: 220,
  },
  {
    name: "lag1_price",
    get label() {
      return t("Lag 1 Price (LKR)");
    },
    type: "number",
    default: 215,
  },
  {
    name: "lag4_price",
    get label() {
      return t("Lag 4 Price (LKR)");
    },
    type: "number",
    default: 200,
  },
  {
    name: "rolling4_mean_price",
    get label() {
      return t("Rolling 4-Week Mean Price (LKR)");
    },
    type: "number",
    default: 210,
  },
  {
    name: "lag1_units",
    get label() {
      return t("Lag 1 Units Sold");
    },
    type: "number",
    default: 150,
  },
  {
    name: "lag4_units",
    get label() {
      return t("Lag 4 Units Sold");
    },
    type: "number",
    default: 120,
  },
  {
    name: "rolling4_mean_units",
    get label() {
      return t("Rolling 4-Week Mean Units");
    },
    type: "number",
    default: 135,
  },
  {
    name: "weekend_share",
    get label() {
      return t("Weekend Sales Share (0 - 1)");
    },
    type: "number",
    default: 0.35,
  },
];

export default function ProcurementOptimizerPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();

  const handleSubmit = async (formData) => {
    try {
      // calls the 'demand' model in the ML service
      await run("demand", formData);
    } catch (err) {
      // Error handled inside usePrediction
    }
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("Procurement Optimizer")}
        description={t("Smart stock replenishment decision engine (Buy Now vs. Wait).")}
        action={
          <Link href="/dashboard/predictions">
            <Button variant="secondary">{t("← All Models")}</Button>
          </Link>
        }
      />

      <div className="space-y-6">
        <PredictionForm fields={PROCUREMENT_FIELDS} loading={loading} onSubmit={handleSubmit} />

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
