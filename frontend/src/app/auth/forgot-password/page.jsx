"use client";
import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/services/api/auth.api";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: fd.get("email") });
      setSent(true);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-teal text-white text-2xl shadow-lg">🔑</div>
          <h1 className="font-outfit text-3xl font-bold text-slate-900">Reset password</h1>
          <p className="mt-2 text-slate-500">Enter your email to receive a reset link</p>
        </div>
        <div className="card-elevated">
          {sent ? (
            <div className="py-4 text-center space-y-3">
              <div className="text-4xl">📧</div>
              <p className="font-semibold text-slate-800">Check your inbox</p>
              <p className="text-sm text-slate-500">A password reset link has been sent to your email.</p>
              <Link href="/auth/login" className="btn-primary inline-flex mt-2">Back to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">Email Address</span>
                <input name="email" type="email" placeholder="you@example.com" required className="input-field" />
              </label>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
              <p className="text-center text-sm text-slate-500">
                <Link href="/auth/login" className="text-teal-700 hover:underline">Back to Sign In</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
