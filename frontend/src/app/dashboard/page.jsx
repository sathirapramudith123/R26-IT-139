"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import useTransactions from "@/hooks/useTransactions";
import useInventory from "@/hooks/useInventory";
import { formatCurrency } from "@/lib/formatters";
import {
  TrendingUp, TrendingDown, Wallet, PackageX, ArrowUpRight, ArrowDownRight,
  CreditCard, Package, Handshake, ShoppingCart, Landmark, Building2, Bot, BookOpen,
} from "lucide-react";

const MODULES = [
  { href: "/dashboard/transactions",    label: "Transactions", desc: "Sales, purchases & expenses", icon: CreditCard,  tint: "teal" },
  { href: "/dashboard/journal",         label: "Journal",      desc: "Double-entry ledger",         icon: BookOpen,    tint: "indigo" },
  { href: "/dashboard/inventory",       label: "Inventory",    desc: "Stock & batches",             icon: Package,     tint: "amber" },
  { href: "/dashboard/procurement",     label: "Procurement",  desc: "Purchase orders",             icon: ShoppingCart,tint: "rose" },
  { href: "/dashboard/suppliers",       label: "Suppliers",    desc: "Your vendors",                icon: Handshake,   tint: "emerald" },
  { href: "/dashboard/agency-banking",  label: "Agency Banking", desc: "Deposits & withdrawals",    icon: Landmark,    tint: "sky" },
  { href: "/dashboard/my-banks",        label: "My Banks",     desc: "Float accounts",              icon: Building2,   tint: "violet" },
  { href: "/dashboard/predictions",     label: "Predictions",  desc: "AI insights",                 icon: Bot,         tint: "fuchsia" },
];

const TINT = {
  teal:    "bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400",
  indigo:  "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
  amber:   "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  rose:    "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  sky:     "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  violet:  "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  fuchsia: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950 dark:text-fuchsia-400",
};

// stat card gradient colours (fixed — not time-of-day)
const STAT = {
  income:  ["#0F766E", "#14B8A6"],
  expense: ["#B45309", "#F59E0B"],
  profit:  ["#15803D", "#22C55E"],
  stock:   ["#1E3A8A", "#3B82F6"],
};

/* Count-up animation: eases a number from 0 to `target`. */
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const end = Number(target) || 0;
    if (end === 0) { setVal(0); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(end * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setVal(end);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export default function DashboardPage() {
  useAuthGuard();
  const { items: txns, loading: tl, fetchAll: fetchTx } = useTransactions();
  const { items: inv, loading: il, fetchAll: fetchInv } = useInventory();
  useEffect(() => { fetchTx(); fetchInv(); }, [fetchTx, fetchInv]);

  const m = useMemo(() => {
    const income = txns.filter(t => ["sale", "deposit"].includes(t.transaction_type)).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = txns.filter(t => ["purchase", "expense"].includes(t.transaction_type)).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const lowStock = inv.filter(i => Number(i.quantity) <= Number(i.reorder_level)).length;
    return { income, expense, profit: income - expense, lowStock };
  }, [txns, inv]);

  const recent = useMemo(() =>
    [...txns].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5), [txns]);

  const aIncome  = useCountUp(m.income);
  const aExpense = useCountUp(m.expense);
  const aProfit  = useCountUp(m.profit);
  const aStock   = useCountUp(m.lowStock);

  const stats = [
    { key: "income",  label: "Total Income",    value: formatCurrency(Math.round(aIncome)),  icon: TrendingUp,   grad: STAT.income },
    { key: "expense", label: "Total Expense",   value: formatCurrency(Math.round(aExpense)), icon: TrendingDown, grad: STAT.expense },
    { key: "profit",  label: "Net Profit",      value: formatCurrency(Math.round(aProfit)),  icon: Wallet,       grad: STAT.profit },
    { key: "stock",   label: "Low Stock Items", value: `${Math.round(aStock)}`,              icon: PackageX,     grad: STAT.stock },
  ];

  if (tl || il) return <div className="page-container"><LoadingSpinner label="Loading dashboard..." /></div>;

  return (
    <div className="page-container space-y-6">
      {/* ===== Simple gradient hero ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 right-24 h-32 w-32 rounded-full bg-white/5" />
        <p className="relative text-sm font-medium text-white/80">Ayubowan 👋</p>
        <h1 className="relative mt-1 font-outfit text-2xl font-bold sm:text-3xl">Here's your Lanka-Link today</h1>
        <p className="relative mt-2 max-w-lg text-sm text-white/70">
          A quick snapshot of your income, expenses and stock — plus fast access to everything you manage.
        </p>
      </div>

      {/* ===== Stat cards ===== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="relative overflow-hidden rounded-2xl p-5 text-white shadow-md"
              style={{ background: `linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})` }}>
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white/80">{s.label}</p>
                  <p className="mt-1.5 font-outfit text-2xl font-bold leading-tight break-words">{s.value}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Modules */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-outfit text-lg font-bold text-slate-900 dark:text-slate-100">Modules</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link key={mod.href} href={mod.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${TINT[mod.tint]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 font-semibold text-slate-800 dark:text-slate-200">{mod.label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{mod.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="mb-3 font-outfit text-lg font-bold text-slate-900 dark:text-slate-100">Recent activity</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
            {recent.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent.map((t, i) => {
                  const isIncome = ["sale", "deposit"].includes(t.transaction_type);
                  return (
                    <li key={t.id || i} className="flex items-center gap-3 p-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isIncome ? "bg-emerald-100 dark:bg-emerald-950" : "bg-rose-100 dark:bg-rose-950"}`}>
                        {isIncome ? <ArrowDownRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  : <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium capitalize text-slate-800 dark:text-slate-200">
                          {String(t.transaction_type || "").replace(/_/g, " ")}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {t.category || t.payment_method || "—"} · {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold ${
                        isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {isIncome ? "+" : "-"} {formatCurrency(t.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/dashboard/transactions"
              className="block border-t border-slate-100 p-3 text-center text-xs font-semibold text-teal-600 hover:bg-slate-50 dark:border-slate-800 dark:text-teal-400 dark:hover:bg-slate-800">
              View all transactions →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}