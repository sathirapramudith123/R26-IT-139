"use client";

import { t } from "@/lib/i18n";

// Best supplier(s) for the whole order: ranked by how many of the items they carry,
// nearest first as a tiebreaker once a delivery point is picked.
export default function OrderSupplierList({
  items,
  orderSupplierCandidates,
  orderItemNames,
  bestOrderSupplierId,
  cheapestSupplierId,
  hasCoords,
}) {
  return (
    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-normal text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300">
      <div className="mb-1.5 font-semibold">
        {t("Best supplier for this order (")}
        {items.length} item{items.length > 1 ? "s" : ""}):
      </div>
      {orderSupplierCandidates.length === 0 ? (
        <>{t("No known supplier carries any of these items yet.")}</>
      ) : (
        <ul className="space-y-1.5">
          {orderSupplierCandidates.slice(0, 5).map((s) => (
            <li
              key={s.id}
              className="border-b border-blue-100/60 pb-1.5 last:border-0 last:pb-0 dark:border-slate-700"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium">
                  {s.name}
                  {s.id === bestOrderSupplierId && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                      {t("Best match")}
                    </span>
                  )}
                  {s.id === cheapestSupplierId && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      {t("💰 Cheapest")}
                    </span>
                  )}
                </span>
                <span>
                  {s.matchedCount}/{orderItemNames.length} items
                  {s.distanceKm != null ? ` · ${s.distanceKm.toFixed(1)} km` : ""}
                </span>
              </div>
              <p className="mt-0.5 text-slate-500">
                LKR {s.totalPrice.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                {!s.fullMatch ? t("(for items they carry)") : ""}
              </p>
              {s.missing.length > 0 && (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {t("Missing:")} {s.missing.join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {!hasCoords && orderSupplierCandidates.length > 0 && (
        <p className="mt-1.5 text-[11px] text-slate-400">
          {t("Pick a delivery location below to rank by distance too.")}
        </p>
      )}
    </div>
  );
}
