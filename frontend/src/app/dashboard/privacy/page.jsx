"use client";

import { Database, Lock, Landmark, Bot, MapPin, CheckCircle2 } from "lucide-react";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import { t } from "@/lib/i18n";

// How Lanka-Link handles data — every point describes what the app actually does
// (same content as the mobile app's Privacy & Security screen).
const SECTIONS = [
  {
    icon: Database,
    title: "Where your data is kept",
    points: [
      "Your sales, stock, suppliers and banking records are stored in a secure cloud database (Supabase / PostgreSQL).",
      "Every request is checked against your login, so you only ever see your own shop's data.",
    ],
  },
  {
    icon: Lock,
    title: "Login and passwords",
    points: [
      "Passwords are never stored as text — only a bcrypt hash that cannot be turned back into the password.",
      "A login lasts 8 hours, then you are signed out automatically.",
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
    </div>
  );
}
