"use client";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import useTransactions from "@/hooks/useTransactions";
import useInventory from "@/hooks/useInventory";
import { formatCurrency } from "@/lib/formatters";

const QUICK = [
  { href: "/dashboard/transactions/create", label: "New Transaction", icon: "💳" },
  { href: "/dashboard/inventory/create",    label: "Add Inventory",   icon: "📦" },
  { href: "/dashboard/suppliers/create",    label: "Add Supplier",    icon: "🤝" },
  { href: "/dashboard/procurement/create",  label: "Procurement",     icon: "🛒" },
  { href: "/dashboard/agency-banking/create", label: "Agency Banking", icon: "🏦" },
  { href: "/dashboard/predictions",         label: "Predictions",     icon: "🤖" },
];

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

  const cards = [
    { label: "Total Income", value: formatCurrency(m.income), gradient: "gradient-teal" },
    { label: "Total Expense", value: formatCurrency(m.expense), gradient: "gradient-amber" },
    { label: "Net Profit", value: formatCurrency(m.profit), gradient: "gradient-emerald" },
    { label: "Low Stock Items", value: `${m.lowStock}`, gradient: "gradient-navy" },
  ];

  return (
    <div className="page-container">
      <PageHeader title="Dashboard" description="Your business overview." />
      {tl || il ? <LoadingSpinner label="Loading dashboard..." /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(c => (
              <div key={c.label} className={`metric-card ${c.gradient}`}>
                <p className="text-sm font-medium text-white/80">{c.label}</p>
                <p className="mt-1.5 font-outfit text-2xl font-bold text-white">{c.value}</p>
              </div>
            ))}
          </div>
          <Card>
            <h3 className="mb-4 font-outfit font-semibold text-slate-900">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {QUICK.map(q => (
                <Link key={q.href} href={q.href} className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center text-xs font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700">
                  <span className="text-2xl">{q.icon}</span>{q.label}
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}