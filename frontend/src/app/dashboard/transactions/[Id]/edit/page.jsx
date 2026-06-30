"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import TransactionForm from "@/components/forms/TransactionForm";
import { transactionApi } from "@/services/api/transaction";

export default function EditTransactionPage() {
  useAuthGuard();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    transactionApi.getById(id).then(setItem).catch(e => setError(e.message || "Failed to load")).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="page-container">
      <PageHeader title="Edit Transaction" description="Update transaction details."
        action={<Link href="/dashboard/transactions"><Button variant="secondary">← Back</Button></Link>} />
      {loading ? <LoadingSpinner /> : error ? <p className="text-sm text-red-600">{error}</p> :
       !item ? <p className="text-sm text-slate-500">Not found.</p> :
       <TransactionForm initialData={item} txId={id} />}
    </div>
  );
}