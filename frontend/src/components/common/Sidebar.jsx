"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/constants";

const ORDER = ["overview", "finance", "operations", "account"];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm md:w-64 md:sticky md:top-20">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl gradient-teal flex items-center justify-center text-white text-sm">🌿</div>
          <div className="font-outfit text-sm font-bold text-slate-900">Lanka-Link</div>
        </div>
      </div>
      <nav className="p-3 space-y-4">
        {ORDER.map(group => {
          const items = NAV_ITEMS.filter(i => i.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{NAV_GROUPS[group]}</div>
              <div className="space-y-0.5">
                {items.map(item => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link key={item.href} href={item.href} className={`nav-link ${active ? "nav-link-active" : "nav-link-inactive"}`}>
                      <span className="text-base leading-none">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}