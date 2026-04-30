"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error } = useAuth();
  const [formError, setFormError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const values = Object.fromEntries(fd.entries());
    if (!values.full_name || !values.email || !values.password) {
      setFormError("All fields are required.");
      return;
    }
    try {
      await register(values);
      router.push("/dashboard");
    } catch (err) {
      setFormError(err.message || "Registration failed");
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white text-2xl shadow-lg">
            🌿
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Create account</h1>
          <p className="mt-2 text-slate-500">Join Lanka-Link and manage your business</p>
        </div>

        <div className="card-elevated">
          <form onSubmit={handleSubmit} className="space-y-5">
            {(formError || error) && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {formError || error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">Full Name</label>
              <input
                name="full_name"
                type="text"
                placeholder="Your full name"
                required
                className="input-field"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">Email Address</label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="input-field"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">Password</label>
              <input
                name="password"
                type="password"
                placeholder="Create a password"
                required
                className="input-field"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
