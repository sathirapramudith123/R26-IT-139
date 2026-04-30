"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import SavingsForm from "@/components/forms/SavingsForm";
import { savingsApi } from "@/services/api/savings.api";

export default function CreateSavingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(values) {
    setLoading(true); setError(null);
    try { await savingsApi.create(values); router.push("/dashboard/savings"); }
    catch (err) { setError(err.message || "Failed to create savings goal"); }
    finally { setLoading(false); }
  }

  return (
    <div className="page-container">
      <PageHeader title="New Savings Goal" description="Set up a new savings target for your business."
        action={<Link href="/dashboard/savings"><Button variant="secondary">← Back</Button></Link>} />
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      <SavingsForm onSubmit={handleSubmit} submitLabel={loading ? "Saving…" : "Create Goal"} />
    </div>
  );
}
