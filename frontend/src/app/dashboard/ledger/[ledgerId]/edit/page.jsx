"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import LedgerForm from "@/components/forms/LedgerForm";
import { ledgerApi } from "@/services/api/ledger.api";

export default function EditLedgerPage() {
  useAuthGuard();
  const { ledgerId } = useParams();
  const [item,    setItem]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!ledgerId) return;
    ledgerApi.getById(ledgerId)
      .then(setItem)
      .catch(e => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [ledgerId]);

  return (
    <div className="page-container">
      <PageHeader title="Edit Ledger Entry" description="Update financial ledger information."
        action={<Link href={`/dashboard/ledger/${ledgerId}`}><Button variant="secondary">← Back</Button></Link>} />
      {loading ? <LoadingSpinner /> :
       error   ? <p className="text-sm text-red-600">{error}</p> :
       !item   ? <p className="text-sm text-slate-500">Entry not found.</p> :
       <LedgerForm initialData={item} ledgerId={ledgerId} />}
    </div>
  );
}