"use client";
import Card from "@/components/ui/Card";

export default function PredictionResult({ result, positiveLabel = "Yes", negativeLabel = "No", scoreLabel = "Score" }) {
  if (!result) return null;
  const { prediction, score } = result;
  const hasScore = typeof score === "number";
  const isPositive = prediction === 1 || prediction === true;
  const pct = hasScore ? Math.min(100, Math.max(0, score)) : null;
  const color = pct == null ? "#0f766e" : pct >= 70 ? "#1D9E75" : pct >= 40 ? "#BA7517" : "#E24B4A";

  return (
    <Card className="max-w-3xl">
      <h3 className="font-outfit text-lg font-bold text-slate-900 mb-4">Prediction Result</h3>
      {!hasScore ? (
        <div className="rounded-xl bg-slate-50 px-5 py-4">
          <p className="text-xs text-slate-400">Predicted value</p>
          <p className="text-3xl font-bold text-slate-900">{Number(prediction).toFixed(1)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-5 py-4">
            <span className="text-sm font-medium text-slate-500">Decision</span>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {isPositive ? positiveLabel : negativeLabel}
            </span>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">{scoreLabel}</span>
              <span className="font-bold" style={{ color }}>{pct.toFixed(1)}/100</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}