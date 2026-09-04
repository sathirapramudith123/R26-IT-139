"use client";

import { useEffect, useState } from "react";
import { transactionApi } from "@/services/api/transaction";
import { formatCurrency } from "@/lib/formatters";
import { BookOpen, ChevronRight, ChevronLeft, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function JournalPage() {
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState([]);        // [{month:"2026-09", count}]
  const [selMonth, setSelMonth] = useState(null);  // "2026-09"
  const [days, setDays] = useState([]);            // [{date, entries, totals}]
  const [selDay, setSelDay] = useState(null);      // "2026-09-15"
  const [dayEntries, setDayEntries] = useState([]);
  const [totals, setTotals] = useState(null);

  // 1. load available months on mount
  useEffect(() => {
    transactionApi.journal({})
      .then((d) => setMonths(d.months || []))
      .catch(() => setMonths([]))
      .finally(() => setLoading(false));
  }, []);

  // 2. pick a month → load its days
  async function openMonth(ym) {
    setSelMonth(ym); setSelDay(null); setDayEntries([]);
    const [year, month] = ym.split("-");
    setLoading(true);
    try {
      const d = await transactionApi.journal({ year, month });
      setDays(d.days || []);
      setTotals(d.totals || null);
    } catch { setDays([]); }
    finally { setLoading(false); }
  }

  // 3. pick a day → show that day's entries
  function openDay(day) {
    setSelDay(day.date);
    setDayEntries(day.entries || []);
  }

  function backToMonths() { setSelMonth(null); setDays([]); setSelDay(null); setDayEntries([]); }
  function backToDays()   { setSelDay(null); setDayEntries([]); }

  const prettyMonth = (ym) => {
    const [y, m] = ym.split("-");
    return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
  };

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950">
          <BookOpen className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="font-outfit text-2xl font-bold text-slate-900 dark:text-slate-100">General Journal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Double-entry records (Debit / Credit) for every transaction.
          </p>
        </div>
      </div>

      {/* breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={backToMonths} className={`hover:text-teal-600 ${!selMonth ? "font-semibold text-slate-800 dark:text-slate-200" : ""}`}>
          Months
        </button>
        {selMonth && (<><ChevronRight className="h-4 w-4" />
          <button onClick={backToDays} className={`hover:text-teal-600 ${selMonth && !selDay ? "font-semibold text-slate-800 dark:text-slate-200" : ""}`}>
            {prettyMonth(selMonth)}
          </button></>)}
        {selDay && (<><ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">{selDay}</span></>)}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading…</div>
      ) : !selMonth ? (
        /* ---------- LEVEL 1: months ---------- */
        months.length === 0 ? (
          <Empty text="No transactions recorded yet." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {months.map((m) => (
              <button key={m.month} onClick={() => openMonth(m.month)}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-teal-300 hover:shadow dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="font-outfit text-lg font-bold text-slate-900 dark:text-slate-100">{prettyMonth(m.month)}</p>
                  <p className="text-xs text-slate-500">{m.count} transaction{m.count > 1 ? "s" : ""}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </button>
            ))}
          </div>
        )
      ) : !selDay ? (
        /* ---------- LEVEL 2: days in the month ---------- */
        <div className="space-y-3">
          {totals && <BalanceBanner totals={totals} label={`${prettyMonth(selMonth)} total`} />}
          {days.length === 0 ? <Empty text="No entries this month." /> : (
            <div className="space-y-2">
              {days.map((d) => (
                <button key={d.date} onClick={() => openDay(d)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">{d.date}</span>
                    <span className="text-xs text-slate-500">({d.entries.length / 2} txn)</span>
                  </span>
                  <span className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">Dr {formatCurrency(d.total_debit)}</span>
                    <span className="text-slate-500">Cr {formatCurrency(d.total_credit)}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ---------- LEVEL 3: journal entries for the day ---------- */
        <JournalTable entries={dayEntries} />
      )}
    </div>
  );
}

function BalanceBanner({ totals, label }) {
  const ok = totals.balanced;
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
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

function JournalTable({ entries }) {
  const totalDebit = entries.reduce((s, e) => s + Number(e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + Number(e.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // group into journal pairs (each transaction = 2 rows sharing journal_ref)
  return (
    <div className="space-y-3">
      <BalanceBanner totals={{ total_debit: totalDebit, total_credit: totalCredit, balanced }} label="Day total" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <th className="px-4 py-3 text-left font-semibold">Particulars</th>
              <th className="px-4 py-3 text-right font-semibold">Debit (LKR)</th>
              <th className="px-4 py-3 text-right font-semibold">Credit (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const isCredit = e.direction === "CR";
              const newTxn = i % 2 === 0;   // first row of a pair
              return (
                <tr key={i} className={`border-t border-slate-100 dark:border-slate-800 ${newTxn && i > 0 ? "border-t-2 border-slate-200 dark:border-slate-700" : ""}`}>
                  <td className={`px-4 py-2.5 ${isCredit ? "pl-10 text-slate-500 italic" : "font-medium text-slate-800 dark:text-slate-200"}`}>
                    {e.particulars}
                    {newTxn && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:bg-slate-800">{e.transaction_type}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{e.debit ? formatCurrency(e.debit) : ""}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{e.credit ? formatCurrency(e.credit) : ""}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold dark:border-slate-600 dark:bg-slate-800">
              <td className="px-4 py-3 text-right">Total</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalDebit)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalCredit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
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