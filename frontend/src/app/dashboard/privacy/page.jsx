"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Lock, Landmark, Bot, MapPin, CheckCircle2, LogOut } from "lucide-react";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import { t } from "@/lib/i18n";
import { authApi } from "@/services/api/auth";
import { tokenService } from "@/lib/auth/tokenService";

// How Lanka-Link handles data — every point describes what the app actually does
// (same content as the mobile app's Privacy & Security screen).
const SECTIONS = [
  {
    icon: Database,
    title: "Where your data is kept",
    points: [
      "Your sales, stock, suppliers and banking records are stored in a secure cloud database.",
      "Every request is checked against your login, so you only ever see your own shop's data.",
    ],
  },
  {
    icon: Lock,
    title: "Login and passwords",
    points: [
      "Passwords are never stored as text — only a bcrypt hash that cannot be turned back into the password.",
      "A login lasts 8 hours, then you are signed out automatically.",
      "Changing or resetting your password signs you out on every other device.",
      "Password-reset links work for 1 hour and only once. Repeated wrong logins are slowed down.",
    ],
  },
  {
    icon: Landmark,
    title: "Banking safety",
    points: [
      "CBSL daily limits for agent banking are always enforced — over-limit transactions are refused.",
      "Float and cash updates run as one database transaction, so two actions at the same moment cannot corrupt a balance.",
    ],
  },
  {
    icon: Bot,
    title: "AI predictions",
    points: [
      "The AI models only receive figures worked out from your records (for example monthly sales or stock-out rate), and only through our own server.",
      "Every prediction shows the reasons behind it, so you can check it.",
    ],
  },
  {
    icon: MapPin,
    title: "Location and maps",
    points: [
      "Your location is read only when you click “Use My Location” — your browser asks you first.",
      "Map searches and routes are sent to Google Maps to find places and distances.",
    ],
  },
];

export default function PrivacyPage() {
  useAuthGuard();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function signOutEverywhere() {
    if (!confirm(t("Sign out of Lanka-Link on all devices, including this one?"))) return;
    setBusy(true);
    setErr(null);
    try {
      await authApi.logoutAll();
      tokenService.clearToken();
      router.replace("/auth/login");
    } catch (e) {
      setErr(t(e.message || "Failed"));
      setBusy(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader title={t("Privacy & Security")} description={t("How your data is handled")} />
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map(({ icon: Icon, title, points }) => (
          <div key={title} className="card">
            <h3 className="flex items-center gap-3 font-display text-base font-semibold text-slate-800 dark:text-slate-100">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                <Icon className="h-4 w-4" />
              </span>
              {t(title)}
            </h3>
            <ul className="mt-3 space-y-2">
              {points.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{t(p)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* lost a phone / used a shared computer: end every session at once */}
      <div className="card mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display font-semibold text-slate-800 dark:text-slate-100">
            {t("Sign out of all devices")}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("Lost a phone or used a shared computer? End every session of your account at once.")}
          </p>
          {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
        </div>
        <button onClick={signOutEverywhere} disabled={busy} className="btn-secondary shrink-0 !text-red-600">
          <LogOut className="h-4 w-4" /> {busy ? t("Signing out…") : t("Sign out everywhere")}
        </button>
      </div>
    </div>
  );
}
