"use client";

import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import { InfluenceChart } from "@/components/predictions/InsightWidgets";
import usePrediction from "@/hooks/usePrediction";
import { formatCurrency } from "@/lib/formatters";
import { isoWeekYear, daysToAvurudu, field } from "@/lib/predictionDefaults";

import { t } from "@/lib/i18n";

// Inputs of the Buy now / Wait model (procurement_buy_wait_model.pkl). Defaults: a carrot whose
// price fell 15% in 4 weeks — the model advises buying; make the change +18% to see "wait".
const NOW = isoWeekYear();
const DAYS = daysToAvurudu();

const PROCUREMENT_FIELDS = [
  field("item", "Item", "text", "Carrot", "e.g. Carrot, Beans, Cabbage, Brinjals, Big Onion (Local)"),
  field("category", "Category", "text", "Up Country", "Up Country, Low Country, Fruit or Grocery/Staple"),
  field("iso_year", "ISO Year", "number", NOW.year),
  field("iso_week", "ISO Week", "number", NOW.week),
  field("current_price_rs", "Today's price (LKR)", "number", 300),
  field(
    "price_change_4wk_pct",
    "Price change in the last 4 weeks (%)",
    "number",
    -15,
    "Negative = the price fell. Try +18 to see the advice change",
  ),
  field(
    "price_vs_3mo_avg_pct",
    "Today's price vs the 3-month average (%)",
    "number",
    -12,
    "Negative = below the usual price",
  ),
  field("days_to_festival", "Days to Avurudu", "number", DAYS),
  field(
    "festival_season",
    "Festival Season (0/1)",
    "number",
    DAYS >= 1 && DAYS <= 43 ? 1 : 0,
    "1 when Avurudu is 1–43 days away",
  ),
];

const ACTION = {
  BULK_BUY_NOW: [
    "Buy now — in bulk",
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  ],
  MODERATE_BUY: ["Buy now", "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"],
  WAIT_DO_NOT_BUY: [
    "Wait — prices may improve",
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ],
};

function ProcurementResult({ result }) {
  const [label, cls] = ACTION[result.recommended_action] || [result.recommended_action || "—", ""];
  const now = Number(result.current_price_lkr || 0);
  const later = Number(result.predicted_4w_price_lkr || 0);
  const alerts = (result.rule_alerts || []).filter((a) => a && a !== "None");
  return (
    <div className="card space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cls}`}>{t(label)}</span>
        <span className="text-sm text-slate-500">
          {t("Chance the price rises in 4 weeks")}:{" "}
          <b>{Number(result.buy_confidence_score || 0).toFixed(0)}%</b>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
          <p className="text-xs text-slate-500">{t("Price today")}</p>
          <p className="text-lg font-bold">{formatCurrency(now)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
          <p className="text-xs text-slate-500">{t("Expected price in 4 weeks")}</p>
          <p className="text-lg font-bold">
            {formatCurrency(later)}{" "}
            <span className={`text-xs ${later > now ? "text-rose-600" : "text-emerald-600"}`}>
              ({later >= now ? "+" : ""}
              {now ? (((later - now) / now) * 100).toFixed(1) : "0"}%)
            </span>
          </p>
        </div>
      </div>
      {alerts.map((a) => (
        <p
          key={a}
          className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          {t(a)}
        </p>
      ))}
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

export default function ProcurementOptimizerPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();

  const handleSubmit = async (formData) => {
    try {
      await run("procurement", formData); // the Buy now / Wait model
    } catch {
      // shown through `error`
    }
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("Procurement Optimizer")}
        description={t("Buy now or wait? Enter an item's market price trend and see the advice.")}
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

        {result && <ProcurementResult result={result} />}
      </div>
    </div>
  );
}
