"use client";
import { useState } from "react";
import { KeyRound, UserPen } from "lucide-react";
import { authApi } from "@/services/api/auth";
import { tokenService } from "@/lib/auth/tokenService";
import { t } from "@/lib/i18n";

// Change your name, and your password (the backend checks the current password)
export default function EditProfileCard({ name, onNameSaved }) {
  const [fullName, setFullName] = useState(name === "—" ? "" : name);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(null); // "name" | "password"
  const [msg, setMsg] = useState({}); // { name?: {ok, text}, password?: {ok, text} }

  async function saveName(e) {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      setMsg({ name: { ok: false, text: t("Enter your full name.") } });
      return;
    }
    setBusy("name");
    try {
      const user = await authApi.updateMe({ full_name: fullName.trim() });
      onNameSaved(user);
      setMsg({ name: { ok: true, text: t("Name updated.") } });
    } catch (err) {
      setMsg({ name: { ok: false, text: t(err.message || "Save failed.") } });
    } finally {
      setBusy(null);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    const fail = (text) => setMsg({ password: { ok: false, text } });
    if (!pw.current) return fail(t("Enter your current password."));
    if (pw.next.length < 6) return fail(t("At least 6 characters"));
    if (pw.next !== pw.confirm) return fail(t("The new passwords don't match."));
    setBusy("password");
    try {
      const res = await authApi.changePassword({ current_password: pw.current, new_password: pw.next }); // ggignore
      // other devices are signed out; this browser continues with the new token
      if (res?.token) tokenService.setToken(res.token);
      setPw({ current: "", next: "", confirm: "" });
      setMsg({ password: { ok: true, text: t("Password changed.") } });
    } catch (err) {
      fail(t(err.message || "Save failed."));
    } finally {
      setBusy(null);
    }
  }

  const note = (m) =>
    m && (
      <p
        className={`rounded-xl px-3 py-2 text-xs font-medium ${
          m.ok
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
        }`}
      >
        {m.text}
      </p>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={saveName} className="card space-y-3">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-slate-800 dark:text-slate-100">
          <UserPen className="h-4 w-4 text-brand-600" /> {t("Your name")}
        </h3>
        <p className="text-xs text-slate-500">{t("Shown on your profile and on your reports.")}</p>
        {note(msg.name)}
        <input
          className="input-field"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t("Your full name")}
          autoComplete="name"
        />
        <button type="submit" disabled={busy === "name"} className="btn-primary w-full">
          {busy === "name" ? t("Saving...") : t("Save")}
        </button>
      </form>

      <form onSubmit={savePassword} className="card space-y-3">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-slate-800 dark:text-slate-100">
          <KeyRound className="h-4 w-4 text-brand-600" /> {t("Change password")}
        </h3>
        <p className="text-xs text-slate-500">{t("You stay signed in on this device.")}</p>
        {note(msg.password)}
        <input
          type="password"
          className="input-field"
          value={pw.current}
          onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
          placeholder={t("Current password")}
          autoComplete="current-password"
        />
        <input
          type="password"
          className="input-field"
          value={pw.next}
          onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
          placeholder={t("New password")}
          autoComplete="new-password"
        />
        <input
          type="password"
          className="input-field"
          value={pw.confirm}
          onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
          placeholder={t("Confirm new password")}
          autoComplete="new-password"
        />
        <button type="submit" disabled={busy === "password"} className="btn-primary w-full">
          {busy === "password" ? t("Saving...") : t("Change password")}
        </button>
      </form>
    </div>
  );
}
