"use client";

import { t } from "@/lib/i18n";
import { formatLkr } from "@/lib/procurement";

// Suppliers that carry the selected item, ranked by a combined score of price (incl. delivery fee),
// distance to the delivery point and delivery lead time.
export default function ItemSupplierList({
  itemName,
  matchingSuppliers,
  scoredSuppliers,
  mappableSuppliers,
  bestOverallId,
  nearestSupplierId,
  cheapestSingleId,
  fastestSingleId,
  hasCoords,
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">
      {matchingSuppliers.length === 0 ? (
        <>
          {t('No known supplier for "')}
          {itemName}
          {t('" yet.')}
        </>
      ) : (
        <>
          <div className="mb-1.5 font-semibold">
            {t("Suppliers for")} {itemName}:
          </div>
          <ul className="space-y-1.5">
            {scoredSuppliers.map((s) => (
              <li
                key={s.id}
                className="border-b border-blue-100/60 pb-1.5 last:border-0 last:pb-0 dark:border-slate-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-1">
                    {s.name}
                    {s.id === bestOverallId && (
                      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                        {t("🏆 Best overall")}
                      </span>
                    )}
                    {s.id === nearestSupplierId && (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {t("📍 Nearest")}
                      </span>
                    )}
                    {s.id === cheapestSingleId && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        {t("💰 Cheapest")}
                      </span>
                    )}
                    {s.id === fastestSingleId && (
                      <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                        {t("🚚 Fastest")}
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-0.5 text-slate-500">
                  LKR {formatLkr(s.estimatedCost)}
                  {" · "}
                  {s.leadTimeDays}
                  {t("-day delivery")}
                  {s.distanceKm != null ? ` · ${s.distanceKm.toFixed(1)} km` : ""}
                </p>
              </li>
            ))}
            {matchingSuppliers.length > mappableSuppliers.length && (
              <li className="pt-1 text-slate-400">
                + {matchingSuppliers.length - mappableSuppliers.length}{" "}
                {t("more without a saved map location")}
              </li>
            )}
          </ul>
          {!hasCoords && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              {t("Pick a delivery location below to factor in distance too.")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
