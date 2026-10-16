"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { SidebarNav, ICONS, isActive } from "./Sidebar";

// Phones only (below md): an app-style bottom tab bar with the most used pages, and a "Menu"
// tab that opens the full sidebar as a drawer from the left.
const TABS = ["/dashboard", "/dashboard/transactions", "/dashboard/inventory", "/dashboard/suppliers"];

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // close when the page changes; Esc closes; the page behind does not scroll while open
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const tabs = TABS.map((href) => NAV_ITEMS.find((i) => i.href === href)).filter(Boolean);
  // "Menu" is highlighted when the current page is not one of the tabs
  const inMenu = !tabs.some((i) => isActive(pathname, i.href));

  const tabClass = (active) =>
    `flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
      active ? "text-brand-600 dark:text-brand-400" : "text-slate-500 dark:text-slate-400"
    }`;

  return (
    <div className="md:hidden">
      {/* drawer */}
      <div
        className={`fixed inset-0 z-50 bg-slate-900/50 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("Menu")}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform dark:bg-slate-900 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <span className="font-display font-bold text-slate-900 dark:text-slate-100">{t("Menu")}</span>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={t("Close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </aside>

      {/* bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
        {tabs.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={tabClass(active)}>
              {Icon && <Icon className="h-5 w-5" />}
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
        <button onClick={() => setOpen(true)} className={tabClass(inMenu || open)}>
          <Menu className="h-5 w-5" />
          <span>{t("Menu")}</span>
        </button>
      </nav>
    </div>
  );
}
