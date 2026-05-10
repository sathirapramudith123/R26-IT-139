"use client";
import { useState } from "react";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { isValidEmail, isRequired } from "@/lib/validators/index";

export default function AuthForm({ mode = "login", onSubmit, loading, error }) {
  const isLogin    = mode === "login";
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
    if (!isRequired(values.email))                   e.email     = "Email is required.";
    else if (!isValidEmail(values.email))            e.email     = "Enter a valid email address.";
    if (!isRequired(values.password))                e.password  = "Password is required.";
    else if (isRegister && values.password.length < 6) e.password = "Password must be at least 6 characters.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    // No login_as — backend assigns role from DB automatically
    await onSubmit({ email: values.email, password: values.password, full_name: values.full_name });
  }

  const cls = k =>
    `input-field ${fieldErrors[k] ? "border-red-400 ring-2 ring-red-100 focus:border-red-400 focus:ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isRegister && (
        <FormField label="Full Name" error={fieldErrors.full_name} required>
          <input className={cls("full_name")} value={values.full_name}
            onChange={e => set("full_name", e.target.value)}
            placeholder="Your full name" />
        </FormField>
      )}

      <FormField label="Email Address" error={fieldErrors.email} required>
        <input className={cls("email")} type="email" value={values.email}
          onChange={e => set("email", e.target.value)}
          placeholder="you@example.com" />
      </FormField>

      <FormField label="Password" error={fieldErrors.password}
        hint={isRegister ? "Minimum 6 characters." : undefined} required>
        <input className={cls("password")} type="password" value={values.password}
          onChange={e => set("password", e.target.value)}
          placeholder={isRegister ? "Create a password" : "Your password"} />
      </FormField>

      {isLogin && (
        <div className="flex justify-end">
          <Link href="/auth/forgot-password" className="text-sm text-teal-700 hover:underline">
            Forgot password?
          </Link>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading
          ? (isLogin ? "Signing in…" : "Creating account…")
          : (isLogin ? "Sign In" : "Create Account")}
      </Button>

      <p className="text-center text-sm text-slate-500">
        {isLogin ? (
          <>New to Lanka-Link?{" "}
            <Link href="/auth/register" className="font-semibold text-teal-700 hover:underline">
              Create account
            </Link>
          </>
        ) : (
          <>Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-teal-700 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
