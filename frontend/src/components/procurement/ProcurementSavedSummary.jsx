"use client";

import Button from "@/components/ui/Button";
import { addDays, formatLkr as fmt } from "@/lib/procurement";

import { t } from "@/lib/i18n";
// Shown after saving: the ranked suppliers for the order (best match first), so the merchant
// knows whom to contact before leaving the page.
export default function ProcurementSavedSummary({
  prNo,
  items,
  totalCost,
  date,
  savedSuppliers,
  cheapestSupplierId,
  onContinue,
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="card-elevated space-y-1 text-center">
        <div className="text-3xl">✅</div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("Procurement Saved")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {prNo} · {items.length} item{items.length > 1 ? "s" : ""} {t("· LKR")} {fmt(totalCost)}
        </p>
        {savedSuppliers[0] && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("Expected arrival:")} {addDays(date, savedSuppliers[0].lead_time_days)} {t("(based on")}{" "}
            {savedSuppliers[0].name}
            {t("'s")} {savedSuppliers[0].lead_time_days ?? 0}
            {t("-day lead time)")}
          </p>
        )}
      </div>

      <div className="card-elevated space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("Recommended Suppliers")}</h2>
        <p className="text-sm text-slate-400">
          {t("Best match first, then the next-nearest suppliers for this order.")}
        </p>

        {savedSuppliers.length === 0 ? (
          <p className="text-sm text-slate-400">{t("No known supplier carries any of these items yet.")}</p>
        ) : (
          <div className="space-y-3">
            {savedSuppliers.map((s, i) => (
              <div key={s.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                    #{i + 1} {s.name}
                    {i === 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                        {t("Best match")}
                      </span>
                    )}
                    {s.id === cheapestSupplierId && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        {t("💰 Cheapest")}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-slate-500">
                    {s.matchedCount}/{items.length} items
                    {s.distanceKm != null ? ` · ${s.distanceKm.toFixed(1)} km away` : ""}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-medium">{t("Items they carry:")}</span> {s.matchedItems.join(", ")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  LKR {s.totalPrice.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                  {!s.fullMatch ? t("(for items they carry)") : ""}
                </p>
                {s.missing.length > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    {t("Missing:")} {s.missing.join(", ")}
                  </p>
                )}
                {s.delivery_location && (
                  <p className="mt-1 text-xs text-slate-400">📍 {s.delivery_location}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <Button type="button" onClick={onContinue}>
          {t("Continue")}
        </Button>
      </div>
    </div>
  );
}
