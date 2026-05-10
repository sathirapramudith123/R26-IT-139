"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { tokenService } from "@/services/auth/tokenService";

export default function Sidebar() {
  const pathname = usePathname();

  // ── Delay role reading until after hydration ──────────────────────────────
  // Reading localStorage during SSR returns null → role defaults to "merchant"
  // → mismatch with client value → hydration error.
  // Fix: initialise with null, set real value in useEffect (client-only).
  const [role, setRole] = useState(null);

  useEffect(() => {
    const user = tokenService.getUser();
    setRole(user?.role ?? "merchant");
  }, []);

  // While role is not yet known (SSR + first paint) render nothing role-specific
  // so server and client HTML match. Content appears after first useEffect fires
  // which is imperceptible to the user.
  const effectiveRole = role ?? "merchant";

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.roleRequired === "bank_agent") {
      return effectiveRole === "bank_agent" || effectiveRole === "admin";
    }
    if (item.roleRequired === "admin") {
      return effectiveRole === "admin";
    }
    return true;
  });

  const groups = [
    { label: "Overview",   items: visibleItems.slice(0, 1) },
    {
      label: "Finance",
      items: visibleItems.filter(i =>
        ["/dashboard/inventory", "/dashboard/ledger",
         "/dashboard/procurement", "/dashboard/agency-banking"].includes(i.href)
      ),
    },
    {
      label: "Operations",
      items: visibleItems.filter(i =>
        ["/dashboard/suppliers", "/dashboard/transactions",
         "/dashboard/notifications"].includes(i.href)
      ),
    },
    {
      label: "Account",
      items: visibleItems.filter(i =>
        ["/dashboard/profile", "/dashboard/admin/users",
         "/dashboard/admin/price-data"].includes(i.href)
      ),
    },
  ];

  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm md:w-64 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">

      {/* Brand */}
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl gradient-teal flex items-center justify-center text-white text-sm">
            🌿
          </div>
          <div>
            <div className="font-outfit text-sm font-bold text-slate-900">Lanka-Link</div>
            {/* suppress until role is hydrated to avoid mismatch */}
            {role && (
              <div className="text-xs text-slate-400 capitalize">{role} Portal</div>
            )}
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-4">
        {groups.map((group) =>
          group.items.length === 0 ? null : (
            <div key={group.label}>
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-link ${active ? "nav-link-active" : "nav-link-inactive"}`}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      <span>{item.label}</span>
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )
        )}
      </nav>

      {/* Role indicator */}
      <div className="border-t border-slate-100 px-4 py-3">
        {role && (
          <p className="text-xs text-slate-400">
            Signed in as{" "}
            <span className="font-medium capitalize text-slate-600">{role}</span>
          </p>
        )}
      </div>
    </aside>
  );
}