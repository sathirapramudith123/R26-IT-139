"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import { InfluenceChart } from "@/components/predictions/InsightWidgets";
import usePrediction from "@/hooks/usePrediction";

import { t } from "@/lib/i18n";
import { isoWeekYear, daysToAvurudu, field } from "@/lib/predictionDefaults";
// Defaults: today's ISO week and Avurudu countdown, and a typical week of White Sugar from the
// training data (demand_forecast_weekly.csv). Change one value at a time to see its effect.
const NOW = isoWeekYear();
const DAYS = daysToAvurudu();

const FIELDS = [
  field(
    "item",
    "Item",
    "text",
    "White Sugar",
    "e.g. White Sugar, Nadu Rice, Red Dhal, Big Onion, Eggs (White)",
  ),
  field("category", "Category", "text", "Grocery/Staple", "Grocery/Staple or Vegetable/Fruit"),
  field("iso_year", "ISO Year", "number", NOW.year),
  field("iso_week", "ISO Week", "number", NOW.week),
  field("days_to_avurudu", "Days to Avurudu", "number", DAYS, "Try 6 to see the festival effect"),
  field(
    "festival_season",
    "Festival Season (0/1)",
    "number",
    DAYS <= 21 ? 1 : 0,
    "1 when Avurudu is 21 days away or less",
  ),
  field("avg_wholesale_price_rs", "Avg Wholesale Price", "number", 196),
  field("avg_retail_price_rs", "Avg Retail Price", "number", 235),
  field("lag1_units", "Lag 1 Units", "number", 70, "Units sold last week"),
  field("lag4_units", "Lag 4 Units", "number", 68, "Units sold 4 weeks ago"),
  field("rolling4_mean_units", "Rolling 4-wk Mean Units", "number", 69, "Average of the past 4 weeks"),
  field("weekend_share", "Weekend Share", "number", 0.29, "Constant 0.29 in the training data"),
];

function DemandResult({ result }) {
  const units = Number(result.prediction);
  if (!Number.isFinite(units)) return null;
  return (
    <div className="card space-y-4 p-6">
      <div>
        <p className="font-display text-4xl font-bold text-brand-600 dark:text-brand-400">
          ≈ {units.toFixed(0)}
        </p>
        <p className="text-sm text-slate-500">{t("units / next week")}</p>
        <p className="mt-1 text-xs text-slate-400">
          {t("The model's average error is about 11 units per week (test MAE 10.89).")}
        </p>
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

export default function DemandPredictionPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();
  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("Demand Forecast")}
        description={t("Inventory — forecast how many units of an item will sell next week.")}
        action={
          <Link href="/dashboard/predictions">
            <Button variant="secondary">{t("← All Models")}</Button>
          </Link>
        }
      />
      <PredictionForm fields={FIELDS} loading={loading} onSubmit={(f) => run("demand", f).catch(() => {})} />
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {typeof error === "object" ? JSON.stringify(error) : error}
        </div>
      )}
      {result && <DemandResult result={result} />}
    </div>
  );
}
