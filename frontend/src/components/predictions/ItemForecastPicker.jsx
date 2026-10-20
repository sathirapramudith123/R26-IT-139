"use client";

// "Forecast any item" on the Sales Forecast card: pick any inventory item (not only the six best
// sellers) and see its past 8 weeks and next week's forecast. GET /insights/forecast?item=
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { insightsApi } from "@/services/api/insights";
import { inventoryApi } from "@/services/api/inventory";
import ForecastChart from "@/components/predictions/ForecastChart";
import { t } from "@/lib/i18n";
import { forecastWeekRange } from "@/lib/formatters";

export default function ItemForecastPicker() {
  const [names, setNames] = useState([]);
  const [item, setItem] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    inventoryApi
      .list()
      .then((rows) => {
        const list = [
          ...new Set((Array.isArray(rows) ? rows : []).map((r) => r.name || r.item_name).filter(Boolean)),
        ];
        setNames(list.sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => setNames([]));
  }, []);

  useEffect(() => {
    if (!item) return setResult(null);
    let cancelled = false;
    setLoading(true);
    setError(null);
    insightsApi
      .forecastItem(item)
      .then((r) => !cancelled && setResult(r))
      .catch((e) => !cancelled && setError(e.message || t("Failed to load")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [item]);

  // forecast-based reorder point when there is a forecast (same as Buy or Wait)
  const reorderAt = result?.forecast_reorder_level ?? result?.reorder_level;
  const needsReorder = result && Number(result.quantity) <= Number(reorderAt);

  return (
    <div className="mb-3 rounded-2xl border border-dashed border-amber-300 p-3 dark:border-amber-800">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <Search className="h-3.5 w-3.5" /> {t("Forecast any item")}
      </label>
      <select
        value={item}
        onChange={(e) => setItem(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        <option value="">{t("Choose an item…")}</option>
        {names.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      {loading && <p className="mt-2 text-xs text-slate-500">{t("Loading…")}</p>}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {result && !loading && (
        <div className="mt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{result.item}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t("Stock:")} {result.quantity} {t("· Reorder:")} {reorderAt}
                {result.forecast_reorder_level != null && ` ${t("(forecast)")}`}
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  needsReorder
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                {needsReorder ? t("🚩 Reorder now") : t("✓ Adequate")}
              </span>
              {Number(result.this_week_units) > 0 && (
                <p className="mt-1 text-[10px] text-slate-400">
                  {t("This week so far:")} {Number(result.this_week_units)} {t("sold")} ·{" "}
                  {t("counted when the week ends")}
                </p>
              )}
            </div>
            {result.available ? (
              <div className="text-right">
                <span className="font-display text-2xl font-bold text-brand-600 dark:text-brand-400">
                  ≈ {Number(result.forecast_units).toFixed(0)}
                </span>
                <p className="text-[10px] text-slate-500">
                  {t("units · week of")} {forecastWeekRange()}
                </p>
                {result.forecast_capped && (
                  <p className="text-[10px] italic text-slate-400">
                    {t("model said")} ≈{Number(result.model_forecast_units).toFixed(0)} ·{" "}
                    {t("capped at 2× recent sales")}
                  </p>
                )}
                {result.forecast_revenue != null && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {t("≈ Rs")} {Number(result.forecast_revenue).toLocaleString("en-LK")}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-xs italic text-slate-400">{t(result.reason || "No sales data yet")}</span>
            )}
          </div>
          {(result.history || []).some((w) => Number(w.units) > 0) ? (
            <>
              <ForecastChart
                history={result.history}
                forecast={result.available ? result.forecast_units : null}
              />
              {!result.available && (
                <p className="mt-1 text-center text-[11px] italic text-slate-500 dark:text-slate-400">
                  {t("Past sales only — not enough sales in the last 4 weeks to forecast next week.")}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-500">{t("This item has no sales in the last 8 weeks.")}</p>
          )}
        </div>
      )}
    </div>
  );
}
