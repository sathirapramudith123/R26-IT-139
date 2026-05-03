"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import TransactionForm from "@/components/forms/TransactionForm";
import { transactionApi } from "@/services/api/transaction.api";

export default function CreateTransactionPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(values) {
    setLoading(true);
    setError(null);

    try {
      await transactionApi.create(values);
      router.push("/dashboard/transactions");
    } catch (err) {
      setError(err.message || "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="New Transaction"
        description="This automatically creates a ledger entry for financial visibility."
        action={
          <Link href="/dashboard/transactions">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <TransactionForm
        onSubmit={handleSubmit}
        submitLabel={loading ? "Saving..." : "Create Transaction"}
      />
    </div>
  );
}