"use client";

import { useEffect, useState, useCallback } from "react";
import { transactionApi } from "@/services/api/transaction";
import { formatCurrency } from "@/lib/formatters";
import {
  BookOpen, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown,
  Package, FileText, Scale,
} from "lucide-react";

const TABS = [
  { key: "journal", label: "Journal", icon: FileText },
  { key: "goods",   label: "Goods Movement", icon: Package },
  { key: "pnl",     label: "Profit & Loss", icon: Scale },
];

// default range = current month
const firstOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function JournalPage() {
  const [tab, setTab] = useState("journal");
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await transactionApi.journal({ from, to });
      setData(d);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const totals = data?.totals;
  const days = data?.days || [];
  const goods = data?.goods;
  const pnl = data?.profit_loss;

  return (
    <div className="page-container space-y-5">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950">
          <BookOpen className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="font-outfit text-2xl font-bold text-slate-900 dark:text-slate-100">General Journal &amp; Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Double-entry records, goods movement and profit / loss.</p>
        </div>
      </div>

      {/* date range filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </div>
        <button onClick={load}
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">Apply</button>
        <div className="ml-auto flex gap-2 text-xs">
          <QuickRange label="This month" onClick={() => { setFrom(firstOfMonth()); setTo(todayStr()); }} />
          <QuickRange label="Last 7 days" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 6); setFrom(d.toISOString().slice(0,10)); setTo(todayStr()); }} />
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                active ? "bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-400" : "text-slate-500"}`}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading…</div>
      ) : !data ? (
        <Empty text="No data for this range." />
      ) : tab === "journal" ? (
        <JournalTab days={days} totals={totals} />
      ) : tab === "goods" ? (
        <GoodsTab goods={goods} />
      ) : (
        <PnLTab pnl={pnl} />
      )}
    </div>
  );
}

function QuickRange({ label, onClick }) {
  return (
    <button onClick={onClick}
      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
      {label}
    </button>
  );
}

/* ---------------- Journal tab ---------------- */
function JournalTab({ days, totals }) {
  if (!days.length) return <Empty text="No journal entries in this range." />;
  return (
    <div className="space-y-4">
      {totals && <BalanceBanner totals={totals} label="Range total" />}
      {days.map((d) => (
        <div key={d.date} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 dark:bg-slate-800">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{d.date}</span>
            <span className="text-xs text-slate-500">Dr {formatCurrency(d.total_debit)} · Cr {formatCurrency(d.total_credit)}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="px-4 py-2 text-left font-medium">Particulars</th>
                <th className="px-4 py-2 text-right font-medium">Debit</th>
                <th className="px-4 py-2 text-right font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {d.entries.map((e, i) => (
                <tr key={i} className={`border-t border-slate-100 dark:border-slate-800 ${i % 2 === 0 && i > 0 ? "border-t-2" : ""}`}>
                  <td className={`px-4 py-2 ${e.direction === "CR" ? "pl-10 italic text-slate-500" : "font-medium text-slate-800 dark:text-slate-200"}`}>
                    {e.particulars}
                    {i % 2 === 0 && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:bg-slate-800">{e.transaction_type}</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{e.debit ? formatCurrency(e.debit) : ""}</td>
                  <td className="px-4 py-2 text-right font-mono">{e.credit ? formatCurrency(e.credit) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Goods tab ---------------- */
function GoodsTab({ goods }) {
  if (!goods?.items?.length) return <Empty text="No goods movement in this range." />;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Total Sold" value={`${goods.total_sold_qty} units`} tone="down" />
        <StatBox label="Total Bought" value={`${goods.total_bought_qty} units`} tone="up" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <th className="px-4 py-3 text-left font-semibold">Item</th>
              <th className="px-4 py-3 text-right font-semibold">Sold</th>
              <th className="px-4 py-3 text-right font-semibold">Bought</th>
              <th className="px-4 py-3 text-right font-semibold">Net change</th>
            </tr>
          </thead>
          <tbody>
            {goods.items.map((g, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{g.item}</td>
                <td className="px-4 py-2.5 text-right text-rose-600">{g.sold_qty || "—"}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600">{g.bought_qty || "—"}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${g.net_qty > 0 ? "text-emerald-600" : g.net_qty < 0 ? "text-rose-600" : "text-slate-500"}`}>
                  {g.net_qty > 0 ? "▲" : g.net_qty < 0 ? "▼" : ""} {Math.abs(g.net_qty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">▲ stock increased (bought more than sold) · ▼ stock decreased (sold more than bought)</p>
    </div>
  );
}

/* ---------------- Profit & Loss tab ---------------- */
function PnLTab({ pnl }) {
  if (!pnl) return <Empty text="No data for profit / loss." />;
  const row = (label, value, opts = {}) => (
    <div key={opts.rowKey ?? label} className={`flex items-center justify-between px-4 py-2.5 ${opts.bold ? "font-bold" : ""} ${opts.border ? "border-t border-slate-200 dark:border-slate-700" : ""}`}>
      <span className={opts.indent ? "pl-4 text-slate-600 dark:text-slate-400" : "text-slate-700 dark:text-slate-300"}>{label}</span>
      <span className={`font-mono ${opts.color || ""}`}>{formatCurrency(value)}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Trading account */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 px-4 py-2.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Trading Account</div>
        {row("Sales A/C", pnl.sales, { rowKey: "sales" })}
        {row("Less: Cost of Goods Sold", pnl.cost_of_goods, { indent: true, rowKey: "cogs" })}
        {row("Gross Profit", pnl.gross_profit, { rowKey: "gp", bold: true, border: true, color: pnl.gross_profit >= 0 ? "text-emerald-600" : "text-rose-600" })}
      </div>

      {/* P&L account */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 px-4 py-2.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Profit &amp; Loss Account</div>
        {row("Gross Profit b/d", pnl.gross_profit, { rowKey: "gpbd" })}
        {pnl.expenses.length === 0 ? (
          <div className="px-4 py-2.5 text-sm text-slate-400">No expenses recorded.</div>
        ) : (
          <>
            <div className="px-4 pt-2 text-xs font-semibold uppercase text-slate-400">Less: Expenses</div>
            {pnl.expenses.map((e, i) => row(e.account, e.amount, { indent: true, rowKey: `exp-${i}` }))}
            {row("Total Expenses", pnl.total_expenses, { border: true, rowKey: "totexp" })}
          </>
        )}
        {row(pnl.is_profit ? "Net Profit" : "Net Loss", Math.abs(pnl.net_profit), {
          rowKey: "net", bold: true, border: true, color: pnl.is_profit ? "text-emerald-600" : "text-rose-600",
        })}
      </div>

      <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${
        pnl.is_profit ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                      : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40"}`}>
        {pnl.is_profit ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-rose-600" />}
        <span className="font-semibold">{pnl.is_profit ? "Net Profit" : "Net Loss"}: {formatCurrency(Math.abs(pnl.net_profit))}</span>
      </div>
    </div>
  );
}

function StatBox({ label, value, tone }) {
  const color = tone === "up" ? "text-emerald-600" : tone === "down" ? "text-rose-600" : "text-slate-800";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 font-outfit text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function BalanceBanner({ totals, label }) {
  const ok = totals.balanced;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${
      ok ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
         : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"}`}>
      <span className="flex items-center gap-2 font-medium">
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
        {label}
      </span>
      <span className="flex items-center gap-4">
        <span>Total Debit: <b>{formatCurrency(totals.total_debit)}</b></span>
        <span>Total Credit: <b>{formatCurrency(totals.total_credit)}</b></span>
        <span className={ok ? "text-emerald-600" : "text-amber-600"}>{ok ? "Balanced ✓" : "Not balanced"}</span>
      </span>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40">
      {text}
    </div>
  );
}