"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import useAuthGuard from "@/hooks/useAuthGuard";
import { tokenService } from "@/services/auth/tokenService";
import { authApi } from "@/services/api/auth.api";

const ROLE_CONFIG = {
  merchant:   { label: "Merchant",   icon: "🏪", color: "bg-slate-100 text-slate-700 border-slate-200",   desc: "Inventory, ledger, procurement, suppliers" },
  bank_agent: { label: "Bank Agent", icon: "🏦", color: "bg-blue-50   text-blue-700  border-blue-200",    desc: "All merchant modules + agency banking" },
  admin:      { label: "Admin",      icon: "🔑", color: "bg-purple-50 text-purple-700 border-purple-200", desc: "Full access + user management" },
};

export default function ProfilePage() {
  useAuthGuard();
  const router = useRouter();
  const [user,        setUser]        = useState(null);
  const [switching,   setSwitching]   = useState(false);
  const [switchError, setSwitchError] = useState(null);

  useEffect(() => {
    authApi.me()
      .then(data => { tokenService.setUser(data); setUser(data); })
      .catch(() => setUser(tokenService.getUser()));
  }, []);

  const sessionRole = user?.role        ?? "merchant";
  const actualRole  = user?.actual_role ?? sessionRole;
  const availRoles  = tokenService.getAvailableRoles();
  const otherRoles  = availRoles.filter(r => r !== sessionRole);
  const cfg         = ROLE_CONFIG[sessionRole] ?? ROLE_CONFIG.merchant;

  async function switchRole(newRole) {
    setSwitching(true); setSwitchError(null);
    try {
      const d = await authApi.switchRole(newRole);
      tokenService.setToken(d.access_token);
      tokenService.setUser(d.user);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setSwitchError(e.message || "Failed to switch role.");
      setSwitching(false);
    }
  }

  function handleLogout() {
    tokenService.clearToken();
    router.push("/auth/login");
  }

  return (
    <div className="page-container">
      <PageHeader title="My Profile" description="Account details and role settings." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="flex flex-col items-center py-8 text-center">
          <div className="h-20 w-20 rounded-2xl gradient-teal flex items-center justify-center text-4xl shadow-md">
            {cfg.icon}
          </div>
          <h2 className="mt-4 font-outfit text-xl font-bold text-slate-900">{user?.full_name ?? "—"}</h2>
          <p className="text-sm text-slate-500 mt-1">{user?.email ?? "—"}</p>
          <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
          <p className="mt-1.5 text-xs text-slate-400 px-4">{cfg.desc}</p>
          <Button variant="danger" size="sm" className="mt-6" onClick={handleLogout}>
            Sign Out
          </Button>
        </Card>

        <div className="lg:col-span-2 space-y-5">
          <Card title="Account Details">
            <dl className="space-y-3">
              {[
                { label: "Full Name",    value: user?.full_name },
                { label: "Email",        value: user?.email },
                { label: "Account Role", value: ROLE_CONFIG[actualRole]?.label  ?? actualRole  },
                { label: "Session Role", value: ROLE_CONFIG[sessionRole]?.label ?? sessionRole },
                { label: "Account ID",   value: user?.id },
              ].map(d => (
                <div key={d.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <dt className="text-sm font-medium text-slate-500">{d.label}</dt>
                  <dd className="text-sm font-semibold text-slate-800">{d.value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Role switcher — only for users with multiple roles */}
          {otherRoles.length > 0 && (
            <Card title="Switch Role">
              <p className="mb-4 text-sm text-slate-500">
                Currently signed in as <span className="font-semibold text-slate-700">{cfg.label}</span>.
                Switch to change your access level. No sign-in required.
              </p>
              {switchError && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {switchError}
                </div>
              )}
              <div className="space-y-2">
                {otherRoles.map(role => {
                  const rc = ROLE_CONFIG[role] ?? ROLE_CONFIG.merchant;
                  return (
                    <button key={role} onClick={() => switchRole(role)} disabled={switching}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-teal-300 hover:bg-teal-50 disabled:opacity-60">
                      <span className="text-xl">{rc.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{rc.label}</p>
                        <p className="text-xs text-slate-400">{rc.desc}</p>
                      </div>
                      <span className="text-xs font-medium text-teal-700">
                        {switching ? "Switching…" : "Switch →"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Admin shortcut */}
          {actualRole === "admin" && (
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">User Management</p>
                  <p className="text-xs text-slate-400 mt-0.5">Promote merchants to bank agents</p>
                </div>
                <Link href="/dashboard/admin/users">
                  <Button variant="primary" size="sm">Manage Users →</Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
