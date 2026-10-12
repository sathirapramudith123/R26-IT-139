import { FlaskConical, ShieldCheck } from "lucide-react";
import { MODEL_TRUST } from "@/lib/modelTrust";
import { t } from "@/lib/i18n";

// One line under a prediction card: how the model behind it was tested
export function TrustLine({ model }) {
  const m = MODEL_TRUST[model];
  if (!m) return null;
  return (
    <p className="mt-4 flex items-start gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <FlaskConical className="mt-px h-3.5 w-3.5 shrink-0 text-brand-500" />
      <span>
        <b className="text-slate-600 dark:text-slate-300">{m.model}</b> · {m.headline}
      </span>
    </p>
  );
}

const NAMES = {
  credit: () => t("Credit Score"),
  demand: () => t("Sales Forecast"),
  procurement: () => t("Should I Buy?"),
  anomaly: () => t("Account Activity"),
};

// "How sure are these predictions?" — every model, how it was tested and how it compares to a simple rule
export function ModelTrustPanel() {
  return (
    <div className="card p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
        <ShieldCheck className="h-5 w-5 text-brand-600" /> {t("How sure are these predictions?")}
      </h3>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        {t("Each model was tested on data it had never seen and compared with a simple rule.")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(MODEL_TRUST).map(([key, m]) => (
          <div key={key} className="rounded-2xl bg-brand-50 p-4 dark:bg-brand-950">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400">
              {NAMES[key]()}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">{m.model}</p>
            <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{m.headline}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{m.detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        {t(
          "Models were trained on public and simulated data, so the comparisons are fair but the exact numbers are not real-world guarantees.",
        )}
      </p>
    </div>
  );
}
