"use client";

import { useEffect } from "react";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import useDashboard from "@/hooks/useDashboard";

function formatMoney(value) {
  return `LKR ${Number(value || 0).toLocaleString()}`;
}

const quickLinks = [
  { href: "/dashboard/inventory/create", label: "Add Inventory", icon: "📦" },
  { href: "/dashboard/transactions/create", label: "New Transaction", icon: "💳" },
  { href: "/dashboard/suppliers/create", label: "Add Supplier", icon: "🤝" },
  { href: "/dashboard/agency-banking/create", label: "Agency Transaction", icon: "🏦" },
];

export default function DashboardPage() {
  const {
    summary,
    recentActivity,
    loading,
    error,
    fetchSummary,
  } = useDashboard();

  useEffect(() => {
    fetchSummary();

    const interval = setInterval(() => {
      fetchSummary();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchSummary]);

  const metrics = [
    {
      label: "Total Income",
      value: formatMoney(summary?.income),
      change: "From ledger records",
      icon: "💰",
      gradient: "gradient-teal",
    },
    {
      label: "Low Stock Alerts",
      value: `${summary?.low_stock || 0} Items`,
      change: "Need reorder check",
      icon: "⚠️",
      gradient: "gradient-amber",
    },
    {
      label: "Pending Procurement",
      value: `${summary?.pending_procurement || 0} Pending`,
      change: "Awaiting decision",
      icon: "🛒",
      gradient: "gradient-navy",
    },
    {
      label: "Agency Balance",
      value: formatMoney(summary?.agency_balance),
      change: "Agent cash flow",
      icon: "🏦",
      gradient: "gradient-emerald",
    },
    {
      label: "Net Profit",
      value: formatMoney(summary?.profit),
      change: "Income - expenses",
      icon: "📈",
      gradient: "gradient-teal",
    },
    {
      label: "Agency Commission",
      value: formatMoney(summary?.agency_commission),
      change: "Merchant service income",
      icon: "🏧",
      gradient: "gradient-emerald",
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Merchant Dashboard"
        description="Live business overview from ledger, inventory, procurement, and agency banking."
        action={
          <button
            type="button"
            onClick={fetchSummary}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Refresh
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !summary ? (
        <LoadingSpinner label="Loading dashboard..." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((m) => (
              <div key={m.label} className={`metric-card ${m.gradient}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">
                      {m.label}
                    </p>
                    <p className="mt-1.5 font-outfit text-2xl font-bold text-white">
                      {m.value}
                    </p>
                    <p className="mt-1 text-xs text-white/70">{m.change}</p>
                  </div>

                  <span className="text-3xl opacity-90">{m.icon}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card">
              <h3 className="mb-4 font-outfit font-semibold text-slate-900">
                Quick Actions
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {quickLinks.map((q) => (
                  <Link
                    key={q.href}
                    href={q.href}
                    className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center text-xs font-medium text-slate-700 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    <span className="text-2xl">{q.icon}</span>
                    {q.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="card lg:col-span-2">
              <h3 className="mb-4 font-outfit font-semibold text-slate-900">
                Recent Activity
              </h3>

              {!recentActivity || recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No recent activity yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((a, i) => {
                    const type = String(a.type || "transaction");
                    const isIncome = [
                      "sale",
                      "deposit",
                      "cash_deposit",
                      "income",
                    ].includes(type);

                    return (
                      <div
                        key={`${type}-${i}`}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium capitalize text-slate-800">
                            {type.replaceAll("_", " ")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {a.description || "Transaction record"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-sm font-semibold ${
                              isIncome ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {isIncome ? "+" : "-"}
                            {formatMoney(a.amount)}
                          </p>

                          <p className="text-xs text-slate-400">
                            {a.created_at
                              ? new Date(a.created_at).toLocaleDateString("en-LK")
                              : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Link
                href="/dashboard/transactions"
                className="mt-4 block text-center text-sm font-medium text-primary hover:underline"
              >
                View all transactions →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}