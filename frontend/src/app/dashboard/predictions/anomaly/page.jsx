"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PredictionForm from "@/components/predictions/PredictionForm";
import PredictionResult from "@/components/predictions/PredictionResult";
import usePrediction from "@/hooks/usePrediction";

const FIELDS = [
  { name: "txn_type",        label: "Transaction Type", type: "text",   options: ["cash_deposit", "cash_withdrawal", "fund_transfer", "balance_inquiry"], default: "cash_deposit" },
  { name: "amount_abs_rs",   label: "Amount (LKR)",     type: "number", default: 5000 },
  { name: "direction",       label: "Direction",        type: "text",   options: ["in", "out"], default: "in" },
  { name: "channel",         label: "Channel",          type: "text",   options: ["agent", "online", "atm"], default: "agent" },
  { name: "weekday",         label: "Weekday (0-6)",    type: "number", default: 3 },
  { name: "day_of_month",    label: "Day of Month",     type: "number", default: 15 },
  { name: "created_offline", label: "Created Offline (0/1)", type: "number", default: 0 },
  { name: "amount_zscore",   label: "Amount Z-score",   type: "number", default: 0.4 },
];

export default function AnomalyPredictionPage() {
  useAuthGuard();
  const { loading, result, error, run } = usePrediction();
  return (
    <div className="page-container">
      <PageHeader title="Banking Anomaly" description="Component 4 — flag suspicious transactions."
        action={<Link href="/dashboard/predictions"><Button variant="secondary">← All Models</Button></Link>} />
      <PredictionForm fields={FIELDS} loading={loading} onSubmit={f => run("anomaly", f).catch(() => {})} />
      {error && <div className="max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <PredictionResult result={result} positiveLabel="⚠ Anomaly" negativeLabel="✓ Normal" scoreLabel="Anomaly score" />
    </div>
  );
}