"use client";

// Journal → Cash: the shop's Cash A/C (cash flow and balance) and, kept apart, the agency-banking
// cash — customers' deposits and withdrawals, float top-ups, today's cash on hand and each partner
// bank's float. Data: GET /reports/cash-flow (backend report.controller.js).
import { useEffect, useState } from "react";
import { Wallet, Landmark, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { transactionApi } from "@/services/api/transaction";
import { formatCurrency } from "@/lib/formatters";
import { t } from "@/lib/i18n";

const when = (v) =>
  new Date(v).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const EVENT = {
  DEPOSIT: "Customer deposit",
  WITHDRAWAL: "Customer withdrawal",
  TOPUP: "Float top-up",
  WITHDRAWAL_REVERSAL: "Withdrawal reversed",
  DEPOSIT_REVERSAL: "Deposit reversed",
};
const HEALTH = {
  HEALTHY: ["Healthy", "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"],
  LOW_ALERT: ["Low", "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"],
  CRITICAL_ALERT: ["Critical", "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"],
};

function Card({ label, value, tone, sub }) {
  const color =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold tabular-nums ${color}`}>{formatCurrency(value)}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

function Lines({ title, rows, sign }) {
  const entries = Object.entries(rows || {});
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {sign > 0 ? (
          <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-rose-600" />
        )}
        {title}
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">{t("None in this range.")}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {entries.map(([k, v]) => (
            <li key={k} className="flex justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-300">{t(k)}</span>
              <span className="tabular-nums font-medium">{formatCurrency(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Statement({ rows, columns }) {
  if (!rows.length)
    return <p className="py-4 text-center text-sm text-slate-400">{t("No entries in this range.")}</p>;
  return (
    <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 font-semibold ${c.right ? "text-right" : "text-left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-1.5 ${c.right ? "text-right tabular-nums" : ""}`}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const amountCell = (r) => (
  <span
    className={r.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
  >
    {r.amount >= 0 ? "+" : "−"}
    {formatCurrency(Math.abs(r.amount))}
  </span>
);

export default function CashTab({ from, to, reloadKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    transactionApi
      .cashFlow({ from, to })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message || t("Failed to load")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [from, to, reloadKey]);

  if (loading) return <div className="py-16 text-center text-slate-400">{t("Loading…")}</div>;
  if (error || !data) return <p className="py-10 text-center text-sm text-rose-600">{error}</p>;
  const { shop, agency } = data;
  const p = agency.period;
  const today = agency.today;

  return (
    <div className="space-y-8">
      {/* ===== shop cash ===== */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Wallet className="h-5 w-5 text-brand-600" /> {t("Shop cash — Cash A/C")}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card label={t("Opening balance")} value={shop.opening} sub={`${t("before")} ${data.from}`} />
          <Card label={t("Cash in")} value={shop.total_in} tone="good" />
          <Card label={t("Cash out")} value={shop.total_out} tone="bad" />
          <Card
            label={t("Cash A/C balance")}
            value={shop.closing}
            tone={shop.closing >= 0 ? "good" : "bad"}
            sub={`${t("as at")} ${data.to}`}
          />
        </div>
        <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
          <Lines title={t("Cash in")} rows={shop.cash_in} sign={1} />
          <Lines title={t("Cash out")} rows={shop.cash_out} sign={-1} />
        </div>
        <Statement
          rows={shop.entries}
          columns={[
            { key: "date", label: t("Date"), render: (r) => when(r.date) },
            { key: "kind", label: t("Type"), render: (r) => t(r.kind) },
            { key: "note", label: t("Details") },
            { key: "amount", label: t("Amount"), right: true, render: amountCell },
            { key: "balance", label: t("Balance"), right: true, render: (r) => formatCurrency(r.balance) },
          ]}
        />
      </section>

      {/* ===== agency banking cash (separate) ===== */}
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Landmark className="h-5 w-5 text-brand-600" /> {t("Agency banking cash")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("Customers' money, kept separate from the shop's cash — not income or expenses of the shop.")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card
            label={t("Cash on hand (now)")}
            value={today.cash_on_hand}
            sub={`${t("Day started with")} ${formatCurrency(today.day_start_cash)}`}
          />
          <Card label={t("Available for withdrawals")} value={today.available_for_withdrawals} tone="good" />
          <Card
            label={t("Available for float top-up")}
            value={today.available_for_topup}
            sub={`${t("Reserve kept")} ${formatCurrency(today.reserve_floor)}`}
          />
          <Card label={t("Total float (all banks)")} value={agency.total_float} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("Cash flow in this range")}
            </p>
            <ul className="space-y-1 text-sm">
              {[
                [t("Customer deposits received"), p.deposits, 1],
                [t("Customer withdrawals paid out"), p.withdrawals, -1],
                [t("Cash used for float top-ups"), p.float_topups, -1],
                [t("Withdrawals reversed"), p.reversals_in, 1],
                [t("Deposits reversed"), p.reversals_out, -1],
              ].map(([label, v, sign]) => (
                <li key={label} className="flex justify-between gap-3">
                  <span className="text-slate-600 dark:text-slate-300">{label}</span>
                  <span
                    className={`tabular-nums font-medium ${sign > 0 ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {sign > 0 ? "+" : "−"}
                    {formatCurrency(v)}
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-slate-200 pt-1.5 font-semibold dark:border-slate-700">
                <span>{t("Net cash change")}</span>
                <span className="tabular-nums">{formatCurrency(p.net)}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("Float per partner bank")}
            </p>
            {agency.banks.length === 0 ? (
              <p className="text-sm text-slate-400">{t("No partner banks yet.")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {agency.banks.map((b) => {
                  const [label, cls] = HEALTH[b.health] || [b.health, ""];
                  return (
                    <li key={b.id} className="flex items-center justify-between gap-3">
                      <span>
                        <span className="font-medium text-slate-800 dark:text-slate-100">{b.bank_name}</span>
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
                          {t(label)}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {t("Floor")} {formatCurrency(b.float_floor)} · {t("Ceiling")}{" "}
                          {formatCurrency(b.float_ceiling)}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums">
                          {formatCurrency(b.float_balance)}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {t("available for deposits")}: {formatCurrency(b.available_for_deposits)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <Statement
          rows={p.entries}
          columns={[
            { key: "date", label: t("Date"), render: (r) => when(r.date) },
            { key: "event", label: t("Type"), render: (r) => t(EVENT[r.event] || r.event) },
            { key: "customer", label: t("Customer"), render: (r) => r.customer || "—" },
            { key: "bank", label: t("Bank") },
            { key: "amount", label: t("Cash"), right: true, render: amountCell },
          ]}
        />
      </section>
    </div>
  );
}
