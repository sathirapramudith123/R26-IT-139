"use client";
import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Card from "@/components/ui/Card";
import useDashboard from "@/hooks/useDashboard";
import useAgencyBanking from "@/hooks/useAgencyBanking";
import { formatCurrency, formatDate } from "@/lib/formatters/index";

const TYPE_ICONS = {
  cash_deposit:    "⬇",
  cash_withdrawal: "⬆",
  fund_transfer:   "↔",
  balance_inquiry: "🔍",
};

const QUICK_LINKS = [
  { href: "/dashboard/agency-banking/create",  label: "New Transaction",  icon: "🏦" },
  { href: "/dashboard/agency-banking/summary", label: "Daily Summary",    icon: "📊" },
  { href: "/dashboard/agency-banking",         label: "All Transactions", icon: "📋" },
  { href: "/dashboard/inventory/create",       label: "Add Inventory",    icon: "📦" },
  { href: "/dashboard/transactions/create",    label: "New Ledger Entry", icon: "💳" },
  { href: "/dashboard/procurement/create",     label: "Procurement",      icon: "🛒" },
];

export default function BankAgentDashboard() {
  const { summary: bizSummary, loading: bizLoading, fetchSummary } = useDashboard();
  const { items: agencyItems, summary: agencySummary, loading: agencyLoading, fetchAll } = useAgencyBanking();

  useEffect(() => {
    fetchSummary();
    fetchAll();
    const t = setInterval(() => { fetchSummary(); fetchAll(); }, 30000);
    return () => clearInterval(t);
  }, [fetchSummary, fetchAll]);

  const loading     = bizLoading || agencyLoading;
  const todayStr    = new Date().toDateString();
  const todayTx     = agencyItems.filter(i => new Date(i.created_at).toDateString() === todayStr);
  const todayCommission = todayTx.reduce((s, i) => s + (i.commission || 0), 0);
  const todayVolume     = todayTx.reduce((s, i) => s + (i.amount    || 0), 0);

  const agencyMetrics = [
    { label: "Today's Transactions", value: todayTx.length,                    icon: "🏦", gradient: "gradient-navy"    },
    { label: "Today's Volume",        value: formatCurrency(todayVolume),       icon: "💵", gradient: "gradient-teal"    },
    { label: "Today's Commission",    value: formatCurrency(todayCommission),   icon: "💰", gradient: "gradient-emerald" },
    { label: "Total Commission",      value: formatCurrency(agencySummary?.total_commission), icon: "🏧", gradient: "gradient-amber" },
  ];

  const bizMetrics = [
    { label: "Business Income",  value: formatCurrency(bizSummary?.income),  icon: "📈" },
    { label: "Business Expense", value: formatCurrency(bizSummary?.expense), icon: "📉" },
    { label: "Net Profit",       value: formatCurrency(bizSummary?.profit),  icon: "💹" },
    { label: "Low Stock Items",  value: `${bizSummary?.low_stock || 0}`,     icon: "⚠️" },
  ];

  const recentAgency = [...agencyItems]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return (
    <div className="page-container">
      <PageHeader
        title="Bank Agent Dashboard"
        description="Agency banking performance and business overview."
        action={
          <button
            onClick={() => { fetchSummary(); fetchAll(); }}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Refresh
          </button>
        }
      />

      {/* Role badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm">
        <span>🏦</span> Signed in as <span className="font-semibold">Bank Agent</span>
      </div>

      {loading && !bizSummary && !agencySummary
        ? <LoadingSpinner label="Loading dashboard..." />
        : (
          <>
            {/* Agency banking metrics */}
            <div>
              <h2 className="mb-3 font-outfit text-sm font-semibold uppercase tracking-wider text-slate-400">
                Agency Banking — Today
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {agencyMetrics.map(m => (
                  <div key={m.label} className={`metric-card ${m.gradient}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-white/80">{m.label}</p>
                        <p className="mt-1.5 font-outfit text-2xl font-bold text-white">{m.value}</p>
                      </div>
                      <span className="text-3xl opacity-90">{m.icon}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CBSL limits reminder */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="font-semibold">CBSL Daily Limits: </span>
              Cash Deposit LKR 50,000 · Cash Withdrawal LKR 25,000 · Fund Transfer LKR 100,000
            </div>

            {/* Business metrics */}
            <div>
              <h2 className="mb-3 font-outfit text-sm font-semibold uppercase tracking-wider text-slate-400">
                Business Overview
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {bizMetrics.map(m => (
                  <Card key={m.label}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-400">{m.label}</p>
                        <p className="mt-1 font-outfit text-xl font-bold text-slate-900">{m.value}</p>
                      </div>
                      <span className="text-2xl opacity-70">{m.icon}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Quick actions */}
              <Card>
                <h3 className="mb-4 font-outfit font-semibold text-slate-900">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {QUICK_LINKS.map(q => (
                    <Link key={q.href} href={q.href}
                      className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center text-xs font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700">
                      <span className="text-2xl">{q.icon}</span>{q.label}
                    </Link>
                  ))}
                </div>
              </Card>

              {/* Recent agency transactions */}
              <div className="card lg:col-span-2">
                <h3 className="mb-4 font-outfit font-semibold text-slate-900">
                  Recent Agency Transactions
                </h3>
                {!recentAgency.length ? (
                  <p className="text-sm text-slate-400">No transactions yet today.</p>
                ) : (
                  <div className="space-y-3">
                    {recentAgency.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{TYPE_ICONS[tx.transaction_type] ?? "🏦"}</span>
                          <div>
                            <p className="text-sm font-medium capitalize text-slate-800">
                              {tx.transaction_type?.replaceAll("_", " ")}
                            </p>
                            <p className="text-xs text-slate-500">{tx.customer_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-800">{formatCurrency(tx.amount)}</p>
                          <p className="text-xs text-emerald-600">+{formatCurrency(tx.commission)} commission</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/dashboard/agency-banking" className="mt-4 block text-center text-sm font-medium text-teal-700 hover:underline">
                  View all agency transactions →
                </Link>
              </div>
            </div>
          </>
        )
      }
    </div>
  );
}
