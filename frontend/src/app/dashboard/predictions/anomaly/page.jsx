"use client";

import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import { InfluenceChart } from "@/components/predictions/InsightWidgets";
import usePrediction from "@/hooks/usePrediction";
import { field } from "@/lib/predictionDefaults";

import { t } from "@/lib/i18n";

// Inputs of the banking anomaly model (banking_anomaly_model.pkl). In the training data the
// direction and channel follow from the transaction type, so they are set from it on submit,
// and the high z-score flag comes from the z-score. Defaults: an ordinary cash deposit;
// the hints show a transaction the model flags.
const TYPE_INFO = {
  cash_in: { direction: "in", channel: "agency_banking_agent" },
  cash_out: { direction: "out", channel: "agency_banking_agent" },
  transfer: { direction: "out", channel: "bank_transfer" },
  payment: { direction: "out", channel: "LankaQR" },
  debit: { direction: "out", channel: "POS_card" },
};

const FIELDS = [
  field("txn_type", "Transaction type", "text", "cash_in", "cash_in, cash_out, transfer, payment or debit"),
  field(
    "amount_abs_rs",
    "Amount (LKR)",
    "number",
    5000,
    "Try: transfer, 950000 and z-score 3.2 — it gets flagged",
  ),
  field(
    "amount_zscore",
    "Amount z-score",
    "number",
    -0.3,
    "How unusual the amount is for this type (above 2 = unusual)",
  ),
  field("weekday", "Weekday (0 = Monday … 6 = Sunday)", "number", 2),
  field("day_of_month", "Day of month", "number", 14),
  field("created_offline", "Created offline (0/1)", "number", 0, "1 = recorded while the agent was offline"),
];

function AnomalyResult({ result }) {
  const flagged = result.is_anomaly === true || result.prediction === 1;
  const risk = Number(result.score || 0);
  const threshold = Number(result.threshold || 0.87) * 100;
  return (
    <div className="card space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            flagged
              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {flagged ? t("🚨 Flagged — ask the agent to verify the customer") : t("✓ Looks normal")}
        </span>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>{t("Risk")}</span>
          <span className="font-semibold">
            {risk.toFixed(1)}% ({t("flag at")} {threshold.toFixed(0)}%)
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${flagged ? "bg-rose-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, Math.max(0, risk))}%` }}
          />
          <div className="absolute top-0 h-full w-0.5 bg-slate-700" style={{ left: `${threshold}%` }} />
        </div>
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

export default function AnomalyPredictionPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();

  const handleSubmit = async (f) => {
    const type = String(f.txn_type || "")
      .trim()
      .toLowerCase();
    const info = TYPE_INFO[type] || TYPE_INFO.cash_in;
    try {
      await run("anomaly", {
        ...f,
        txn_type: TYPE_INFO[type] ? type : "cash_in",
        direction: info.direction,
        channel: info.channel,
        is_high_zscore: Math.abs(Number(f.amount_zscore) || 0) > 2 ? 1 : 0,
      });
    } catch {
      // shown through `error`
    }
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("Banking Anomaly Detection")}
        description={t("Enter an agency-banking transaction and see whether the model flags it.")}
        action={
          <Link href="/dashboard/predictions">
            <Button variant="secondary">{t("← All Models")}</Button>
          </Link>
        }
      />
      <PredictionForm fields={FIELDS} loading={loading} onSubmit={handleSubmit} />
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          {typeof error === "object" ? JSON.stringify(error) : error}
        </div>
      )}
      {result && <AnomalyResult result={result} />}
    </div>
  );
}
