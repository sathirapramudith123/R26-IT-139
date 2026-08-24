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

function normalize(tx) {
  if (!tx) return tx;
  return {
    ...tx,
    transaction_type: tx.transaction_type ? String(tx.transaction_type).toLowerCase() : tx.transaction_type,
    payment_method:   tx.payment_method   ? String(tx.payment_method).toLowerCase()   : tx.payment_method,
  };
}

export default function EditTransactionPage() {
  useAuthGuard();
  const params = useParams();
  const id = params?.id ?? params?.txId ?? params?.transactionId ?? Object.values(params ?? {})[0];

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError("No transaction id found in the URL. Check the [id] route folder name and the Edit link.");
      setLoading(false);
      return;
    }
    if (typeof transactionApi.getById !== "function") {
      setError("transactionApi.getById is not a function — check the method name in services/api/transaction.");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    transactionApi
      .getById(id)
      .then(data => { if (active) setItem(normalize(data)); })
      .catch(e => { if (active) setError(e?.message || "Failed to load transaction."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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