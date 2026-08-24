"use client";

import { useRouter } from "next/navigation";
import AuthForm from "@/components/forms/AuthForm";
import useAuth from "@/hooks/useAuth";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error } = useAuth();

  async function handleSubmit(values) {
    await register(values);
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Create an account
          </h1>
          <p className="text-sm text-slate-400">
            Join Lanka-Link and manage your business
          </p>
        </div>

        {/* Dark Glassmorphism Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl">
          <AuthForm
            mode="register"
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}