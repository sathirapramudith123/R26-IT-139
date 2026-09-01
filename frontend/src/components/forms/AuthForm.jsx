"use client";

import { useState } from "react";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { isValidEmail, isRequired } from "@/lib/validators";
import { User, Mail, Lock, AlertCircle } from "lucide-react";

export default function AuthForm({ mode = "login", onSubmit, loading, error }) {
  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const [fieldErrors, setFieldErrors] = useState({});
  const [values, setValues] = useState({ full_name: "", email: "", password: "" });

  function set(k, v) {
    setValues(p => ({ ...p, [k]: v }));
    setFieldErrors(p => ({ ...p, [k]: undefined }));
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

  const getInputClass = k =>
    `w-full rounded-xl border bg-slate-950/50 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
      fieldErrors[k]
        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
        : "border-slate-800 focus:border-teal-500/50 focus:ring-teal-500/20"
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
        <FormField label="Full Name" error={fieldErrors.full_name} required>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={getInputClass("full_name")}
              value={values.full_name}
              onChange={e => set("full_name", e.target.value)}
              placeholder="Your full name"
            />
          </div>
        </FormField>
      )}

      <FormField label="Email Address" error={fieldErrors.email} required>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className={getInputClass("email")}
            type="email"
            value={values.email}
            onChange={e => set("email", e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      </FormField>

      <FormField
        label="Password"
        error={fieldErrors.password}
        hint={isRegister ? "Minimum 6 characters." : undefined}
        required
      >
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className={getInputClass("password")}
            type="password"
            value={values.password}
            onChange={e => set("password", e.target.value)}
            placeholder={isRegister ? "Create a password" : "Your password"}
          />
        </div>
      </FormField>

      {isLogin && (
        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full justify-center bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50"
      >
        {loading
          ? isLogin
            ? "Signing in…"
            : "Creating account…"
          : isLogin
          ? "Sign In"
          : "Create Account"}
      </Button>

      <p className="text-center text-sm text-slate-400">
        {isLogin ? (
          <>
            New here?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-teal-400 hover:text-teal-300 hover:underline transition-colors"
            >
              Create account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-teal-400 hover:text-teal-300 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}