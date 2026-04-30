"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LedgerForm from "@/components/forms/LedgerForm";
import { ledgerApi } from "@/services/api/ledger.api";

export default function CreateLedgerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(values) {
    setLoading(true); setError(null);
    try { await ledgerApi.create(values); router.push("/dashboard/ledger"); }
    catch (err) { setError(err.message || "Failed to create entry"); }
    finally { setLoading(false); }
  }

  return (
    <div className="page-container">
      <PageHeader title="New Ledger Entry" description="Record a new financial transaction in your ledger."
        action={<Link href="/dashboard/ledger"><Button variant="secondary">← Back</Button></Link>} />
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
      <LedgerForm onSubmit={handleSubmit} submitLabel={loading ? "Saving…" : "Create Entry"} />
    </div>
  );
}
