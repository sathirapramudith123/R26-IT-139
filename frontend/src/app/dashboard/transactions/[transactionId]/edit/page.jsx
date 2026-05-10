"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import TransactionForm from "@/components/forms/TransactionForm";
import { transactionApi } from "@/services/api/transaction.api";

export default function EditTransactionPage() {
  useAuthGuard();
  const router = useRouter();
  const { transactionId } = useParams();

  const [item,    setItem]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!transactionId) return;
    transactionApi.getById(transactionId)
      .then(setItem)
      .catch(e => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [transactionId]);

  async function handleSubmit(formData) {
    await transactionApi.update(transactionId, formData);
    router.push(`/dashboard/transactions/${transactionId}`);
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Edit Transaction"
        description="Update transaction details."
        action={
          <Link href={`/dashboard/transactions/${transactionId}`}>
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !item ? (
        <p className="text-sm text-slate-500">Transaction not found.</p>
      ) : (
        <TransactionForm
          initialData={item}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
        />
      )}
    </div>
  );
}