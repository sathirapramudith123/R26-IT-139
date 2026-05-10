"use client";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/forms/AuthForm";
import useAuth from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error } = useAuth();

  async function handleSubmit(values) {
    await register(values);
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-teal text-white text-2xl shadow-lg">
            🌿
          </div>
          <h1 className="font-outfit text-3xl font-bold text-slate-900">Create account</h1>
          <p className="mt-2 text-slate-500">Join Lanka-Link and manage your business</p>
        </div>
        <div className="card-elevated">
          <AuthForm mode="register" onSubmit={handleSubmit} loading={loading} error={error} />
        </div>
      </div>
    </div>
  );
}
