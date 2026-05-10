"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/common/PageHeader";
import { tokenService } from "@/services/auth/tokenService";

export default function ProfilePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(tokenService.getUser());
  }, []);

  const details = user
    ? [
        { label: "Full Name", value: user.full_name },
        { label: "Email", value: user.email },
        { label: "Role", value: user.role ?? "Merchant" },
        { label: "Account ID", value: user.id }
      ]
    : [
        { label: "Name", value: "Demo Merchant" },
        { label: "Business Type", value: "Grocery Kade" },
        { label: "Location", value: "Rural Sri Lanka" },
        { label: "Connectivity", value: "Offline-first enabled" }
      ];

  return (
    <div className="page-container">
      <PageHeader title="Profile" description="Manage your merchant account and preferences." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Avatar card */}
        <Card className="flex flex-col items-center py-8 text-center">
          <div className="h-20 w-20 rounded-2xl gradient-teal flex items-center justify-center text-4xl shadow-md">
            👤
          </div>
          <h2 className="mt-4 font-outfit text-xl font-bold text-slate-900">
            {user?.full_name ?? "Demo Merchant"}
          </h2>
          <p className="text-sm text-slate-500">{user?.email ?? "demo@lankalink.lk"}</p>
          <span className="mt-2 badge bg-primary/10 text-primary border-0 capitalize">
            {user?.role ?? "Merchant"}
          </span>
        </Card>

        {/* Details card */}
        <Card title="Account Details" className="lg:col-span-2">
          <dl className="space-y-4">
            {details.map((d) => (
              <div key={d.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-sm font-medium text-slate-500">{d.label}</dt>
                <dd className="text-sm font-semibold text-slate-800">{d.value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
