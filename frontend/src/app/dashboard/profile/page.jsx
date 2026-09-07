"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import { tokenService } from "@/services/auth/tokenService";
import {
  User, Mail, Hash, LogOut, Sun, Moon, Shield, Store, ChevronRight,
} from "lucide-react";

export default function ProfilePage() {
  useAuthGuard();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setUser(tokenService.getUser());
    // read current theme from the html element (works with a `.dark` class strategy)
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
    setDark(next);
  }

  function logout() {
    tokenService.clearToken();
    router.push("/auth/login");
  }

  const name = user?.full_name ?? user?.fullName ?? "—";
  const email = user?.email ?? "—";
  const initials = (name && name !== "—")
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "🏪";

  return (
    <div className="page-container space-y-6">
      {/* ===== Profile hero ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 right-24 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white/20 text-3xl font-bold backdrop-blur-sm">
            {initials}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="font-outfit text-2xl font-bold sm:text-3xl">{name}</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/80 sm:justify-start">
              <Mail className="h-4 w-4" /> {email}
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              <Store className="h-3.5 w-3.5" /> Merchant Account
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== Account details ===== */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-outfit text-lg font-bold text-slate-900 dark:text-slate-100">Account Details</h2>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <DetailRow icon={User} label="Full Name" value={name} />
            <DetailRow icon={Mail} label="Email" value={email} />
            <DetailRow icon={Hash} label="Account ID" value={user?.id ?? "—"} mono />
          </div>
        </div>

        {/* ===== Settings / actions ===== */}
        <div>
          <h2 className="mb-3 font-outfit text-lg font-bold text-slate-900 dark:text-slate-100">Settings</h2>
          <div className="space-y-3">
            {/* Theme toggle */}
            <button onClick={toggleTheme}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  {dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Appearance</span>
                  <span className="block text-xs text-slate-500">{dark ? "Dark mode" : "Light mode"}</span>
                </span>
              </span>
              {/* toggle pill */}
              <span className={`relative h-6 w-11 rounded-full transition-colors ${dark ? "bg-teal-500" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${dark ? "left-5" : "left-0.5"}`} />
              </span>
            </button>

            {/* Security (placeholder / info) */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                  <Shield className="h-5 w-5" />
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Security</span>
                  <span className="block text-xs text-slate-500">Your session is protected</span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>

            {/* Sign out */}
            <button onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-teal-600 shadow-sm dark:bg-slate-900 dark:text-teal-400">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`truncate text-sm font-semibold text-slate-800 dark:text-slate-100 ${mono ? "font-mono text-xs" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}