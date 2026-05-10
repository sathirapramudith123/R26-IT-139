"use client";
import { useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import useDashboard from "@/hooks/useDashboard";
import { formatCurrency } from "@/lib/formatters/index";

const QUICK_LINKS = [
  { href: "/dashboard/inventory/create",    label: "Add Inventory",     icon: "📦" },
  { href: "/dashboard/transactions/create", label: "New Transaction",   icon: "💳" },
  { href: "/dashboard/suppliers/create",    label: "Add Supplier",      icon: "🤝" },
  { href: "/dashboard/procurement/create",  label: "Smart Procurement", icon: "🛒" },
  { href: "/dashboard/ledger/journal",      label: "Trial Balance",     icon: "📒" },
  { href: "/dashboard/ledger/reports",      label: "Reports & Export",  icon: "📊" },
];

export default function MerchantDashboard() {
  const { summary, recentActivity, loading, error, fetchSummary } = useDashboard();

  useEffect(() => {
    fetchSummary();
    const t = setInterval(fetchSummary, 30000);
    return () => clearInterval(t);
  }, [fetchSummary]);

  const metrics = [
    { label: "Total Income",        value: formatCurrency(summary?.income),   icon: "💰", gradient: "gradient-teal"    },
    { label: "Total Expense",       value: formatCurrency(summary?.expense),  icon: "💸", gradient: "gradient-amber"   },
    { label: "Net Profit",          value: formatCurrency(summary?.profit),   icon: "📈", gradient: "gradient-emerald" },
    { label: "Low Stock Items",     value: `${summary?.low_stock || 0}`,      icon: "⚠️", gradient: "gradient-amber"   },
    { label: "Pending Procurement", value: `${summary?.pending_procurement || 0}`, icon: "🛒", gradient: "gradient-navy" },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Merchant Dashboard"
        description="Your business overview — finances, stock and procurement."
        action={
          <button onClick={fetchSummary} className="btn-secondary px-4 py-2 text-sm">
            Refresh
          </button>
        }
      />

      {/* Role badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
        <span>🏪</span> Signed in as <span className="font-semibold text-slate-800">Merchant</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading && !summary ? <LoadingSpinner label="Loading dashboard..." /> : (
        <>
          {/* Metric cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map(m => (
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

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Quick actions */}
            <div className="card">
              <h3 className="mb-4 font-outfit font-semibold text-slate-900">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_LINKS.map(q => (
                  <Link key={q.href} href={q.href}
                    className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center text-xs font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700">
                    <span className="text-2xl">{q.icon}</span>{q.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="card lg:col-span-2">
              <h3 className="mb-4 font-outfit font-semibold text-slate-900">Recent Activity</h3>
              {!recentActivity?.length ? (
                <p className="text-sm text-slate-400">No recent activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((a, i) => {
                    const isIncome = ["sale","deposit","income"].includes(a.type);
                    return (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium capitalize text-slate-800">{String(a.type||"").replaceAll("_"," ")}</p>
                          <p className="text-xs text-slate-500">{a.description || "Transaction record"}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${isIncome ? "text-green-600" : "text-red-500"}`}>
                            {isIncome ? "+" : "-"}{formatCurrency(a.amount)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {a.created_at ? new Date(a.created_at).toLocaleDateString("en-LK") : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link href="/dashboard/transactions" className="mt-4 block text-center text-sm font-medium text-teal-700 hover:underline">
                View all transactions →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
