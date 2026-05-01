"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";

export default function Sidebar() {
  const pathname = usePathname();

  const groups = [
    { label: "Overview", items: NAV_ITEMS.slice(0, 1) },
    { label: "Finance", items: NAV_ITEMS.slice(1, 5) },
    { label: "Operations", items: NAV_ITEMS.slice(5, 9) },
    { label: "Account", items: NAV_ITEMS.slice(9) }
  ];

  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm md:w-64 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
      {/* Brand */}
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl gradient-teal flex items-center justify-center text-white text-sm">🌿</div>
          <div>
            <div className="font-outfit text-sm font-bold text-slate-900">Lanka-Link</div>
            <div className="text-xs text-slate-400">Merchant Portal</div>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
        ))}
      </nav>
    </aside>
  );
}
