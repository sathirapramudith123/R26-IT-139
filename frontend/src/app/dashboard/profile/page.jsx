"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { tokenService } from "@/services/auth/tokenService";

export default function ProfilePage() {
  useAuthGuard();
  const router = useRouter();
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(tokenService.getUser()); }, []);

  function logout() { tokenService.clearToken(); router.push("/auth/login"); }

  return (
    <div className="page-container">
      <PageHeader title="My Profile" description="Account details." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center py-8 text-center">
          <div className="h-20 w-20 rounded-2xl gradient-teal flex items-center justify-center text-4xl shadow-md">🏪</div>
          <h2 className="mt-4 font-outfit text-xl font-bold text-slate-900">{user?.full_name ?? user?.fullName ?? "—"}</h2>
          <p className="text-sm text-slate-500 mt-1">{user?.email ?? "—"}</p>
          <Button variant="danger" size="sm" className="mt-6" onClick={logout}>Sign Out</Button>
        </Card>
        <Card className="lg:col-span-2" title="Account Details">
          <dl className="space-y-3">
            {[
              ["Full Name", user?.full_name ?? user?.fullName],
              ["Email", user?.email],
              ["Account ID", user?.id],
            ].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-sm font-medium text-slate-500">{l}</dt>
                <dd className="text-sm font-semibold text-slate-800">{v ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}