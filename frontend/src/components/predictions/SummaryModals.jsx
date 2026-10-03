"use client";

import { useEffect, useState } from "react";
import { insightsApi } from "@/services/api/insights";

import { t } from "@/lib/i18n";
// "View all items" for Sales Forecast: every item's total sold, from GET /insights/sales-summary.
export const SALES_SUMMARY_COLS = [
  {
    key: "item",
    get label() {
      return t("Item");
    },
  },
  {
    key: "total_sold",
    get label() {
      return t("Total Sold");
    },
  },
  {
    key: "avg_sale_price",
    get label() {
      return t("Avg Sale Price");
    },
  },
  {
    key: "total_revenue",
    get label() {
      return t("Total Revenue");
    },
  },
  {
    key: "quantity",
    get label() {
      return t("Stock");
    },
  },
];

export function SalesSummaryModal({ open, onClose }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("total_sold");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    if (!open || rows !== null) return;
    setLoading(true);
    insightsApi
      .getSalesSummary()
      .then((d) => setRows(d.items || []))
      .catch(() => setError("Couldn't load the sales summary. Please try again."))
      .finally(() => setLoading(false));
  }, [open, rows]);

  if (!open) return null;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = (rows || []).filter((r) => r.item?.toLowerCase().includes(search.toLowerCase().trim()));
  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey],
      vb = b[sortKey];
    const cmp = typeof va === "string" ? va.localeCompare(vb) : (Number(va) || 0) - (Number(vb) || 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="card-elevated flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white p-6 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("All Items — Sales Summary")}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-base hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          placeholder={t("Search item...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field mb-3"
        />

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">{t("Loading…")}</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-rose-600">{error}</p>
          ) : sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">{t("No items match.")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {SALES_SUMMARY_COLS.map((c) => (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left font-semibold hover:text-amber-600"
                    >
                      {c.label} {sortKey === c.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{r.item}</td>
                    <td className="px-3 py-2">{r.total_sold}</td>
                    <td className="px-3 py-2">
                      {r.avg_sale_price != null ? `Rs ${r.avg_sale_price.toLocaleString("en-LK")}` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.total_revenue ? `Rs ${r.total_revenue.toLocaleString("en-LK")}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{r.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// "View all items" for Buy or Wait: every item's stock vs reorder level, from GET /insights/procurement-summary.
export const PROCUREMENT_SUMMARY_COLS = [
  {
    key: "item",
    get label() {
      return t("Item");
    },
  },
  {
    key: "quantity",
    get label() {
      return t("Stock");
    },
  },
  {
    key: "reorder_level",
    get label() {
      return t("Reorder");
    },
  },
  {
    key: "deficit",
    get label() {
      return t("Deficit");
    },
  },
  {
    key: "action",
    get label() {
      return t("Status");
    },
  },
];

export function ProcurementSummaryModal({ open, onClose }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("deficit");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    if (!open || rows !== null) return;
    setLoading(true);
    insightsApi
      .getProcurementSummary()
      .then((d) => setRows(d.items || []))
      .catch(() => setError("Couldn't load the stock summary. Please try again."))
      .finally(() => setLoading(false));
  }, [open, rows]);

  if (!open) return null;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = (rows || []).filter((r) => r.item?.toLowerCase().includes(search.toLowerCase().trim()));
  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey],
      vb = b[sortKey];
    const cmp = typeof va === "string" ? va.localeCompare(vb) : (Number(va) || 0) - (Number(vb) || 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="card-elevated flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white p-6 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("All Items — Stock Status")}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-base hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          placeholder={t("Search item...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field mb-3"
        />

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">{t("Loading…")}</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-rose-600">{error}</p>
          ) : sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">{t("No items match.")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {PROCUREMENT_SUMMARY_COLS.map((c) => (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left font-semibold hover:text-orange-600"
                    >
                      {c.label} {sortKey === c.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{r.item}</td>
                    <td className="px-3 py-2">{r.quantity}</td>
                    <td className="px-3 py-2">{r.reorder_level}</td>
                    <td className="px-3 py-2">{r.deficit || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-bold ${
                          r.urgent
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {r.urgent ? t("🛒 Buy") : t("⏳ Wait")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
