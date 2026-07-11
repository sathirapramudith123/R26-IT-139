"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import AgencyBankingForm from "@/components/forms/AgencyBankingForm";
import { agencyBankingApi } from "@/services/api/agencyBanking";

export default function EditAgencyBankingPage() {
  useAuthGuard();
  const { Id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!Id) return;
    agencyBankingApi.getById(Id).then(setItem).catch(e => setError(e.message || "Failed")).finally(() => setLoading(false));
  }, [Id]);

  return (
    <div className="page-container">
      <PageHeader title="Edit Transaction" description="Update transaction details."
        action={<Link href="/dashboard/agency-banking"><Button variant="secondary">← Back</Button></Link>} />
      {loading ? <LoadingSpinner /> : error ? <p className="text-sm text-red-600">{error}</p> :
       !item ? <p className="text-sm text-slate-500">Not found.</p> :
       <AgencyBankingForm initialData={item} agencyId={Id} />}
    </div>
  );
}