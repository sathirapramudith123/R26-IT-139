import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";

const metrics = [
  { label: "Daily Sales",       value: "LKR 24,500", change: "+12%", icon: "💰", gradient: "gradient-teal" },
  { label: "Low Stock Alerts",  value: "4 Items",    change: "Action needed", icon: "⚠️", gradient: "gradient-amber" },
  { label: "Supplier Requests", value: "3 Pending",  change: "Awaiting review", icon: "🛒", gradient: "gradient-navy" },
  { label: "Savings Balance",   value: "LKR 18,000", change: "+5% this month", icon: "🏦", gradient: "gradient-emerald" }
];

const quickLinks = [
  { href: "/dashboard/inventory/create",   label: "Add Inventory",    icon: "📦" },
  { href: "/dashboard/transactions/create", label: "New Transaction",  icon: "💳" },
  { href: "/dashboard/suppliers/create",    label: "Add Supplier",     icon: "🤝" },
  { href: "/dashboard/savings/create",      label: "Create Savings",   icon: "🏦" }
];

const recentActivity = [
  { type: "Sale",       desc: "Rice 10kg × 5 bags",         amount: "+LKR 3,500", time: "2h ago",  color: "text-green-600" },
  { type: "Procurement",desc: "Sugar from Colombo Supplier", amount: "-LKR 8,000", time: "4h ago",  color: "text-red-500" },
  { type: "Savings",    desc: "Monthly deposit",             amount: "+LKR 2,000", time: "1d ago",  color: "text-green-600" },
  { type: "Expense",    desc: "Shop rent payment",           amount: "-LKR 5,000", time: "2d ago",  color: "text-red-500" }
];

export default function DashboardPage() {
  return (
    <div className="page-container">
      <PageHeader
        title="Merchant Dashboard"
        description="Welcome back! Here's your business overview."
      />

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className={`metric-card ${m.gradient}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">{m.label}</p>
                <p className="mt-1.5 font-outfit text-2xl font-bold text-white">{m.value}</p>
                <p className="mt-1 text-xs text-white/70">{m.change}</p>
              </div>
              <span className="text-3xl opacity-90">{m.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="card">
          <h3 className="font-outfit font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((q) => (
              <Link key={q.href} href={q.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center text-xs font-medium text-slate-700 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary">
                <span className="text-2xl">{q.icon}</span>
                {q.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card lg:col-span-2">
          <h3 className="font-outfit font-semibold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.type}</p>
                  <p className="text-xs text-slate-500">{a.desc}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${a.color}`}>{a.amount}</p>
                  <p className="text-xs text-slate-400">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/dashboard/transactions" className="mt-4 block text-center text-sm font-medium text-primary hover:underline">
            View all transactions →
          </Link>
        </div>
      </div>
    </div>
  );
}
