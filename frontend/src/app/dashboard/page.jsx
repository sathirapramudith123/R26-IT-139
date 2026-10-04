"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import useTransactions from "@/hooks/useTransactions";
import useInventory from "@/hooks/useInventory";
import { formatCurrency, titleCase } from "@/lib/formatters";
import {
  TrendingUp,
  TrendingDown,
  PackageX,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Package,
  Handshake,
  ShoppingCart,
  Landmark,
  Building2,
  Bot,
  BookOpen,
} from "lucide-react";

import { t } from "@/lib/i18n";
const MODULES = [
  {
    href: "/dashboard/transactions",
    get label() {
      return t("Transactions");
    },
    get desc() {
      return t("Sales, purchases & expenses");
    },
    icon: CreditCard,
    tint: "brand",
  },
  {
    href: "/dashboard/journal",
    get label() {
      return t("Journal");
    },
    get desc() {
      return t("Double-entry ledger");
    },
    icon: BookOpen,
    tint: "indigo",
  },
  {
    href: "/dashboard/inventory",
    get label() {
      return t("Inventory");
    },
    get desc() {
      return t("Stock & batches");
    },
    icon: Package,
    tint: "amber",
  },
  {
    href: "/dashboard/procurement",
    get label() {
      return t("Procurement");
    },
    get desc() {
      return t("Purchase orders");
    },
    icon: ShoppingCart,
    tint: "rose",
  },
  {
    href: "/dashboard/suppliers",
    get label() {
      return t("Suppliers");
    },
    get desc() {
      return t("Your vendors");
    },
    icon: Handshake,
    tint: "emerald",
  },
  {
    href: "/dashboard/agency-banking",
    get label() {
      return t("Agency Banking");
    },
    get desc() {
      return t("Deposits & withdrawals");
    },
    icon: Landmark,
    tint: "sky",
  },
  {
    href: "/dashboard/my-banks",
    get label() {
      return t("My Banks");
    },
    get desc() {
      return t("Float accounts");
    },
    icon: Building2,
    tint: "violet",
  },
  {
    href: "/dashboard/predictions",
    get label() {
      return t("Predictions");
    },
    get desc() {
      return t("AI insights");
    },
    icon: Bot,
    tint: "fuchsia",
  },
];

const TINT = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  fuchsia: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950 dark:text-fuchsia-400",
};

// stat card icon tints
const STAT = {
  income: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  expense: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
  stock: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
};

/* Count-up animation: eases a number from 0 to `target`. */
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const end = Number(target) || 0;
    if (end === 0) {
      setVal(0);
      return;
    }
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
  useEffect(() => {
    fetchTx();
    fetchInv();
  }, [fetchTx, fetchInv]);

  const m = useMemo(() => {
    const income = txns
      .filter((t) => ["sale", "deposit"].includes(t.transaction_type))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = txns
      .filter((t) => ["purchase", "expense"].includes(t.transaction_type))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const lowStock = inv.filter((i) => Number(i.quantity) <= Number(i.reorder_level)).length;
    return { income, expense, profit: income - expense, lowStock };
  }, [txns, inv]);

  const recent = useMemo(
    () => [...txns].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
    [txns],
  );

  const aIncome = useCountUp(m.income);
  const aExpense = useCountUp(m.expense);
  const aProfit = useCountUp(m.profit);
  const aStock = useCountUp(m.lowStock);

  const stats = [
    {
      key: "income",
      get label() {
        return t("Total Income");
      },
      get caption() {
        return t("money in");
      },
      value: formatCurrency(Math.round(aIncome)),
      icon: TrendingUp,
      tint: STAT.income,
    },
    {
      key: "expense",
      get label() {
        return t("Total Expense");
      },
      get caption() {
        return t("money out");
      },
      value: formatCurrency(Math.round(aExpense)),
      icon: TrendingDown,
      tint: STAT.expense,
    },
    {
      key: "stock",
      get label() {
        return t("Low Stock Items");
      },
      get caption() {
        return t("to restock");
      },
      value: `${Math.round(aStock)}`,
      icon: PackageX,
      tint: STAT.stock,
    },
  ];

  if (tl || il)
    return (
      <div className="page-container">
        <LoadingSpinner label={t("Loading dashboard...")} />
      </div>
    );

  return (
    <div className="page-container space-y-6">
      {/* ===== Blue gradient header with net profit; white stat cards overlap its bottom edge ===== */}
      <div>
        <div className="relative overflow-hidden rounded-3xl gradient-brand px-6 pb-24 pt-7 text-white shadow-elevated sm:px-8">
          <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-white/80">{t("Ayubowan 👋")}</p>
              <p className="mt-3 text-sm font-medium">{t("Net Profit")}</p>
              <p className="mt-1 font-display text-4xl font-semibold tracking-tight">
                {formatCurrency(Math.round(aProfit))}
              </p>
              <p className="mt-1 text-xs text-white/70">{t("Income minus expenses")}</p>
            </div>
          </div>
        </div>

        <div className="relative -mt-16 grid gap-4 px-3 sm:grid-cols-3 sm:px-6">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="card">
                <div className="flex items-center gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${s.tint}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.label}</p>
                </div>
                <p className="mt-3 font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">
                  {s.value}
                </p>
                <p className={`mt-0.5 text-xs font-medium ${s.tint.split(" ")[1]}`}>{s.caption}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Modules */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("Modules")}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="card group p-4 transition hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${TINT[mod.tint]}`}
                  >
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
          <h2 className="mb-3 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("Recent activity")}
          </h2>
          <div className="card p-2">
            {recent.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">{t("No transactions yet.")}</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent.map((tx, i) => {
                  const isIncome = ["sale", "deposit"].includes(tx.transaction_type);
                  return (
                    <li key={tx.id || i} className="flex items-center gap-3 p-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isIncome ? "bg-emerald-100 dark:bg-emerald-950" : "bg-rose-100 dark:bg-rose-950"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium capitalize text-slate-800 dark:text-slate-200">
                          {t(titleCase(tx.transaction_type || ""))}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {tx.category || t(titleCase(tx.payment_method || "")) || "—"} ·{" "}
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-semibold ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"} {formatCurrency(tx.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href="/dashboard/transactions"
              className="block border-t border-slate-100 p-3 text-center text-xs font-semibold text-brand-600 hover:bg-slate-50 dark:border-slate-800 dark:text-brand-400 dark:hover:bg-slate-800"
            >
              {t("View all transactions →")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
