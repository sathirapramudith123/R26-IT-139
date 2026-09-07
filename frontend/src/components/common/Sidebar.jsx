"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, NAV_GROUPS } from "@/lib/constants";
import {
  LayoutDashboard, CreditCard, BookOpen, Package, ShoppingCart,
  Landmark, Building2, Handshake, Bot, User,
} from "lucide-react";

// Map the icon names stored in constants to the actual lucide components.
const ICONS = {
  LayoutDashboard, CreditCard, BookOpen, Package, ShoppingCart,
  Landmark, Building2, Handshake, Bot, User,
};

const ORDER = ["overview", "finance", "operations", "account"];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:sticky md:top-20 md:w-64 dark:border-slate-800 dark:bg-slate-900">
      {/* Nav */}
      <nav className="space-y-5 p-3">
        {ORDER.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {NAV_GROUPS[group]}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = ICONS[item.icon];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-500/25"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      }`}
                    >
                      {/* active left indicator */}
                      {active && (
                        <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-teal-500" />
                      )}
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                        active ? "bg-white/20" : "bg-slate-100 group-hover:bg-white dark:bg-slate-800 dark:group-hover:bg-slate-700"
                      }`}>
                        {Icon ? (
                          <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-500 group-hover:text-teal-600 dark:text-slate-400 dark:group-hover:text-teal-400"}`} />
                        ) : (
                          <span className="text-base leading-none">{item.icon}</span>
                        )}
                      </span>
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