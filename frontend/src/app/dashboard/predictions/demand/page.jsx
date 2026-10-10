"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import PredictionResult from "@/components/predictions/PredictionResult";
import usePrediction from "@/hooks/usePrediction";

import { t } from "@/lib/i18n";
const FIELDS = [
  {
    name: "item",
    get label() {
      return t("Item");
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
    default: 2025,
  },
  {
    name: "iso_week",
    get label() {
      return t("ISO Week");
    },
    type: "number",
    default: 26,
  },
  {
    name: "days_to_avurudu",
    get label() {
      return t("Days to Avurudu");
    },
    type: "number",
    default: 120,
  },
  {
    name: "festival_season",
    get label() {
      return t("Festival Season (0/1)");
    },
    type: "number",
    default: 0,
  },
  {
    name: "avg_wholesale_price_rs",
    get label() {
      return t("Avg Wholesale Price");
    },
    type: "number",
    default: 200,
  },
  {
    name: "avg_retail_price_rs",
    get label() {
      return t("Avg Retail Price");
    },
    type: "number",
    default: 240,
  },
  {
    name: "lag1_price",
    get label() {
      return t("Lag 1 Price");
    },
    type: "number",
    default: 195,
  },
  {
    name: "lag4_price",
    get label() {
      return t("Lag 4 Price");
    },
    type: "number",
    default: 190,
  },
  {
    name: "rolling4_mean_price",
    get label() {
      return t("Rolling 4-wk Mean Price");
    },
    type: "number",
    default: 193,
  },
  {
    name: "lag1_units",
    get label() {
      return t("Lag 1 Units");
    },
    type: "number",
    default: 80,
  },
  {
    name: "lag4_units",
    get label() {
      return t("Lag 4 Units");
    },
    type: "number",
    default: 75,
  },
  {
    name: "rolling4_mean_units",
    get label() {
      return t("Rolling 4-wk Mean Units");
    },
    type: "number",
    default: 78,
  },
  {
    name: "weekend_share",
    get label() {
      return t("Weekend Share");
    },
    type: "number",
    default: 0.3,
  },
];

export default function DemandPredictionPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();
  return (
    <div className="page-container">
      <PageHeader
        title={t("Demand Forecast")}
        description={t("Component 2 — predict units of demand for an item.")}
        action={
          <Link href="/dashboard/predictions">
            <Button variant="secondary">{t("← All Models")}</Button>
          </Link>
        }
      />
      <PredictionForm fields={FIELDS} loading={loading} onSubmit={(f) => run("demand", f).catch(() => {})} />
      {error && (
        <div className="max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <PredictionResult result={result} />
    </div>
  );
}
