"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Lock, ArrowLeft, Loader2 } from "lucide-react";
import { authApi } from "@/services/api/auth";

const inputClass =
  "w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all";

function ResetPasswordContent() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password");
    const confirm = formData.get("confirm");

    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      router.push("/auth/login?reset=1");
    } catch (err) {
      setError(err.message || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-inner">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Set a new password
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose a new password for your Lanka-Link account.
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl">
        {!token ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              This reset link is invalid or incomplete.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-flex w-full items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition-all"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                {error}{" "}
                {/expired|invalid/i.test(error) && (
                  <Link href="/auth/forgot-password" className="font-semibold underline">
                    Request a new link
                  </Link>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300"
              >
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300"
              >
                Confirm new password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Repeat the new password"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Set new password"
              )}
            </button>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600 dark:text-teal-400" />
            <span>Loading...</span>
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
