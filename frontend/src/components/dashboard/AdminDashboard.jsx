"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Card from "@/components/ui/Card";
import AdminPriceUploadWidget from "@/components/dashboard/AdminPriceUploadWidget";
import MarketPriceWidget from "@/components/dashboard/MarketPriceWidget";
import useDashboard from "@/hooks/useDashboard";
import useAgencyBanking from "@/hooks/useAgencyBanking";
import useInventory from "@/hooks/useInventory";
import useNotifications from "@/hooks/useNotifications";
import { apiClient } from "@/services/api/client";
import { formatCurrency, formatDate } from "@/lib/formatters/index";

const ROLE_COLORS = {
  admin:      "bg-purple-50 text-purple-700 border-purple-200",
  bank_agent: "bg-blue-50   text-blue-700   border-blue-200",
  merchant:   "bg-slate-100 text-slate-600  border-slate-200",
};

const QUICK_LINKS = [
  { href: "/dashboard/admin/users",            label: "User Management",   icon: "👥", color: "border-purple-200 hover:bg-purple-50 hover:text-purple-700" },
  { href: "/dashboard/agency-banking/summary", label: "Agency Summary",    icon: "📊", color: "border-blue-200   hover:bg-blue-50   hover:text-blue-700"   },
  { href: "/dashboard/ledger/reports",         label: "Financial Reports", icon: "📈", color: "border-teal-200  hover:bg-teal-50   hover:text-teal-700"    },
  { href: "/dashboard/inventory/alerts",       label: "Stock Alerts",      icon: "⚠️", color: "border-amber-200 hover:bg-amber-50  hover:text-amber-700"   },
  { href: "/dashboard/procurement/create",     label: "Procurement DSS",   icon: "🛒", color: "border-slate-200 hover:bg-slate-50  hover:text-slate-700"   },
  { href: "/dashboard/ledger/journal",         label: "Trial Balance",     icon: "📒", color: "border-slate-200 hover:bg-slate-50  hover:text-slate-700"   },
];

export default function AdminDashboard() {
  const { summary,          loading: bizLoading,    fetchSummary } = useDashboard();
  const { summary: agSum,   loading: agencyLoading, fetchAll: fetchAgency } = useAgencyBanking();
  const { items: inventory, loading: invLoading,    fetchAll: fetchInv } = useInventory();
  const { items: notifs,    loading: notifLoading,  fetchAll: fetchNotifs } = useNotifications();

  const [users,        setUsers]        = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiClient.get("/auth/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => {
    fetchSummary(); fetchAgency(); fetchInv(); fetchNotifs(); fetchUsers();
    const t = setInterval(() => {
      fetchSummary(); fetchAgency(); fetchInv(); fetchNotifs();
    }, 30000);
    return () => clearInterval(t);
  }, [fetchSummary, fetchAgency, fetchInv, fetchNotifs, fetchUsers]);

  const loading = bizLoading || agencyLoading || invLoading;

  const userStats = {
    total:     users.length,
    merchants: users.filter(u => u.role === "merchant").length,
    agents:    users.filter(u => u.role === "bank_agent").length,
    admins:    users.filter(u => u.role === "admin").length,
  };

  const lowStockItems = inventory.filter(i => i.status === "low_stock");
  const unreadNotifs  = notifs.filter(n => !n.is_read).length;

  const systemMetrics = [
    { label: "Total Users",         value: userStats.total,                         icon: "👥", gradient: "gradient-navy"    },
    { label: "Bank Agents",         value: userStats.agents,                        icon: "🏦", gradient: "gradient-teal"    },
    { label: "System Revenue",      value: formatCurrency(summary?.income),         icon: "💰", gradient: "gradient-emerald" },
    { label: "Agency Commission",   value: formatCurrency(agSum?.total_commission), icon: "🏧", gradient: "gradient-amber"   },
    { label: "Low Stock Alerts",    value: `${lowStockItems.length} Items`,         icon: "⚠️", gradient: "gradient-amber"   },
    { label: "Unread Notifications",value: unreadNotifs,                            icon: "🔔", gradient: "gradient-navy"    },
  ];

  const recentUsers = [...users]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return (
    <div className="page-container">
      <PageHeader
        title="Admin Dashboard"
        description="System-wide overview — users, financials, agency banking, and alerts."
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/admin/users" className="btn-primary text-sm px-4 py-2">
              👥 Manage Users
            </Link>
            <button
              onClick={() => { fetchSummary(); fetchAgency(); fetchInv(); fetchNotifs(); fetchUsers(); }}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Refresh
            </button>
          </div>
        }
      />

      <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 shadow-sm">
        <span>🔑</span> Signed in as <span className="font-semibold">Admin</span>
      </div>

      {loading && !summary ? (
        <LoadingSpinner label="Loading admin dashboard..." />
      ) : (
        <>
          {/* System metrics */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {systemMetrics.map(m => (
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

          {/* Quick actions + user breakdown + financial summary */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <h3 className="mb-4 font-outfit font-semibold text-slate-900">Admin Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_LINKS.map(q => (
                  <Link key={q.href} href={q.href}
                    className={`flex flex-col items-center gap-2 rounded-xl border bg-white p-3 text-center text-xs font-medium text-slate-700 transition ${q.color}`}>
                    <span className="text-2xl">{q.icon}</span>{q.label}
                  </Link>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 font-outfit font-semibold text-slate-900">User Breakdown</h3>
              <div className="space-y-3 mb-4">
                {[
                  ["Admins",      userStats.admins,    "bg-purple-500"],
                  ["Bank Agents", userStats.agents,    "bg-blue-500"  ],
                  ["Merchants",   userStats.merchants, "bg-teal-500"  ],
                ].map(([l, v, color]) => {
                  const pct = userStats.total ? Math.round((v / userStats.total) * 100) : 0;
                  return (
                    <div key={l}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="font-medium">{l}</span>
                        <span>{v} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link href="/dashboard/admin/users" className="text-center block text-sm font-medium text-teal-700 hover:underline">
                Manage all users →
              </Link>
            </Card>

            <Card>
              <h3 className="mb-4 font-outfit font-semibold text-slate-900">Financial Summary</h3>
              <div className="space-y-2 mb-4">
                {[
                  ["Total Income",      summary?.income,         "text-green-600"  ],
                  ["Total Expense",     summary?.expense,        "text-red-500"    ],
                  ["Net Profit",        summary?.profit,         "text-slate-900"  ],
                  ["Agency Volume",     agSum?.total_amount,     "text-blue-600"   ],
                  ["Agency Commission", agSum?.total_commission, "text-emerald-600"],
                ].map(([l, v, c]) => (
                  <div key={l} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-xs text-slate-500">{l}</span>
                    <span className={`text-xs font-bold ${c}`}>{formatCurrency(v)}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/ledger/reports" className="text-center block text-sm font-medium text-teal-700 hover:underline">
                Full reports →
              </Link>
            </Card>
          </div>

          {/* ── MARKET PRICE SECTION ──────────────────────────────────────── */}
          {/* Admin uploads HKARTI PDF here. Merchant sees MarketPriceWidget  */}
          {/* automatically on their dashboard after upload. No form needed.  */}
          <div className="grid gap-6 lg:grid-cols-2">
            <AdminPriceUploadWidget />
            <MarketPriceWidget />
          </div>

          {/* Recent registrations */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-outfit font-semibold text-slate-900">Recent Registrations</h3>
              <Link href="/dashboard/admin/users" className="text-sm font-medium text-teal-700 hover:underline">
                View all →
              </Link>
            </div>
            {usersLoading ? (
              <LoadingSpinner label="Loading users..." />
            ) : recentUsers.length === 0 ? (
              <p className="text-sm text-slate-400">No users yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Role</th>
                      <th className="pb-2 font-medium">Joined</th>
                      <th className="pb-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentUsers.map(u => (
                      <tr key={u.id}>
                        <td className="py-2.5 font-medium text-slate-800">{u.full_name || "—"}</td>
                        <td className="py-2.5 text-slate-500">{u.email}</td>
                        <td className="py-2.5">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${ROLE_COLORS[u.role] ?? ROLE_COLORS.merchant}`}>
                            {u.role?.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="py-2.5 text-xs text-slate-400">{formatDate(u.created_at)}</td>
                        <td className="py-2.5">
                          {u.role === "merchant" && (
                            <Link href="/dashboard/admin/users"
                              className="text-xs font-medium text-blue-600 hover:underline">
                              Promote
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Low stock alerts */}
          {lowStockItems.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-outfit font-semibold text-slate-900">
                  ⚠️ Low Stock Alerts
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    {lowStockItems.length}
                  </span>
                </h3>
                <Link href="/dashboard/inventory/alerts" className="text-sm font-medium text-teal-700 hover:underline">
                  View all →
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {lowStockItems.slice(0, 6).map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.supplier_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-red-600">{item.quantity} left</p>
                      <p className="text-xs text-slate-400">min {item.reorder_level}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}