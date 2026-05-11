"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/common/PageHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import useAuthGuard from "@/hooks/useAuthGuard";
import { ROLES } from "@/lib/constants/index";
import { apiClient } from "@/services/api/client";
import { formatDateTime } from "@/lib/formatters/index";

const ROLE_LABELS = {
  merchant:   { label: "Merchant",    color: "bg-slate-100 text-slate-700 border-slate-200"    },
  bank_agent: { label: "Bank Agent",  color: "bg-blue-50  text-blue-700  border-blue-200"      },
  admin:      { label: "Admin",       color: "bg-purple-50 text-purple-700 border-purple-200"  },
};

function RoleBadge({ role }) {
  const cfg = ROLE_LABELS[role] ?? ROLE_LABELS.merchant;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function AdminUsersPage() {
  useAuthGuard(ROLES.ADMIN);

  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [updating,   setUpdating]   = useState(null);   // user id being updated
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiClient.get("/auth/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function changeRole(userId, newRole) {
    setUpdating(userId); setSuccessMsg(null); setError(null);
    try {
      await apiClient.put(`/auth/users/${userId}/role`, { role: newRole });
      setSuccessMsg(`Role updated to ${ROLE_LABELS[newRole]?.label ?? newRole}.`);
      await fetchUsers();
    } catch (e) {
      setError(e.message || "Failed to update role.");
    } finally {
      setUpdating(null);
    }
  }

  const stats = {
    total:      users.length,
    merchants:  users.filter(u => u.role === "merchant").length,
    agents:     users.filter(u => u.role === "bank_agent").length,
    admins:     users.filter(u => u.role === "admin").length,
  };

  return (
    <div className="page-container">
      <PageHeader
        title="User Management"
        description="Promote merchants to bank agents after bank verification. Admin-only."
        action={
          <Button variant="secondary" onClick={fetchUsers} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      {!loading && users.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Total Users",  stats.total,     "text-slate-800"],
            ["Merchants",    stats.merchants, "text-slate-700"],
            ["Bank Agents",  stats.agents,    "text-blue-600" ],
            ["Admins",       stats.admins,    "text-purple-600"],
          ].map(([l, v, c]) => (
            <Card key={l}>
              <p className="text-xs font-medium text-slate-400">{l}</p>
              <p className={`mt-1 text-2xl font-bold ${c}`}>{v}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Feedback banners */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ {successMsg}
        </div>
      )}

      {/* Onboarding guide */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How role promotion works</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>Merchant registers normally at <code className="bg-blue-100 px-1 rounded">/auth/register</code></li>
          <li>Bank verifies the merchant as an authorized agent offline</li>
          <li>Admin clicks <strong>Promote to Bank Agent</strong> below to unlock agency banking</li>
          <li>Merchant logs out and back in — Agency Banking appears in their sidebar</li>
        </ol>
      </div>

      {/* User table */}
      {loading ? (
        <LoadingSpinner label="Loading users..." />
      ) : users.length === 0 ? (
        <EmptyState icon="👤" title="No users found" description="No registered users yet." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Name", "Email", "Role", "Joined", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 font-outfit text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                        {(user.full_name ?? user.email ?? "?")[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">{user.full_name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{user.email}</td>
                  <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                  <td className="px-5 py-4 text-slate-400 text-xs">
                    {formatDateTime(user.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.role === "merchant" && (
                        <button
                          onClick={() => changeRole(user.id, "bank_agent")}
                          disabled={updating === user.id}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          {updating === user.id ? "Updating..." : "Promote to Bank Agent"}
                        </button>
                      )}
                      {user.role === "bank_agent" && (
                        <button
                          onClick={() => changeRole(user.id, "merchant")}
                          disabled={updating === user.id}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {updating === user.id ? "Updating..." : "Demote to Merchant"}
                        </button>
                      )}
                      {user.role === "merchant" && (
                        <button
                          onClick={() => changeRole(user.id, "admin")}
                          disabled={updating === user.id}
                          className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 disabled:opacity-60"
                        >
                          Make Admin
                        </button>
                      )}
                      {user.role === "admin" && (
                        <span className="text-xs text-slate-400 italic">Admin account</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
