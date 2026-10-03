"use client";

import { useState } from "react";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { isValidEmail, isRequired } from "@/lib/validators";
import { User, Mail, Lock, AlertCircle } from "lucide-react";

import { t } from "@/lib/i18n";
export default function AuthForm({ mode = "login", onSubmit, loading, error }) {
  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const [fieldErrors, setFieldErrors] = useState({});
  const [values, setValues] = useState({ full_name: "", email: "", password: "" });

  function set(k, v) {
    setValues((p) => ({ ...p, [k]: v }));
    setFieldErrors((p) => ({ ...p, [k]: undefined }));
  }

  function validate() {
    const e = {};
    if (isRegister && !isRequired(values.full_name)) e.full_name = "Full name is required.";
    if (!isRequired(values.email)) e.email = "Email is required.";
    else if (!isValidEmail(values.email)) e.email = "Enter a valid email address.";
    if (!isRequired(values.password)) e.password = "Password is required.";
    else if (isRegister && values.password.length < 6) e.password = "Password must be at least 6 characters.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    await onSubmit({ email: values.email, password: values.password, full_name: values.full_name });
  }

  const getInputClass = (k) =>
    `w-full rounded-xl border bg-slate-950/50 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
      fieldErrors[k]
        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
        : "border-slate-800 focus:border-brand-500/50 focus:ring-brand-500/20"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isRegister && (
        <FormField label={t("Full Name")} error={fieldErrors.full_name} required>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={getInputClass("full_name")}
              value={values.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder={t("Your full name")}
            />
          </div>
        </FormField>
      )}

      <FormField label={t("Email Address")} error={fieldErrors.email} required>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className={getInputClass("email")}
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder={t("you@example.com")}
          />
        </div>
      </FormField>

      <FormField
        label={t("Password")}
        error={fieldErrors.password}
        hint={isRegister ? t("Minimum 6 characters.") : undefined}
        required
      >
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className={getInputClass("password")}
            type="password"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder={isRegister ? t("Create a password") : t("Your password")}
          />
        </div>
      </FormField>

      {isLogin && (
        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            {t("Forgot password?")}
          </Link>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full justify-center bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-brand-600/20 disabled:opacity-50"
      >
        {loading
          ? isLogin
            ? t("Signing in…")
            : t("Creating account…")
          : isLogin
            ? t("Sign In")
            : t("Create Account")}
      </Button>

      <p className="text-center text-sm text-slate-400">
        {isLogin ? (
          <>
            {t("New here?")}{" "}
            <Link
              href="/auth/register"
              className="font-medium text-brand-400 hover:text-brand-300 hover:underline transition-colors"
            >
              {t("Create account")}
            </Link>
          </>
        ) : (
          <>
            {t("Already have an account?")}{" "}
            <Link
              href="/auth/login"
              className="font-medium text-brand-400 hover:text-brand-300 hover:underline transition-colors"
            >
              {t("Sign in")}
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
