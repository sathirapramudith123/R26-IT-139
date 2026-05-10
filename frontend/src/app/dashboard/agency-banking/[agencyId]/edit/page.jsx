"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { ROLES } from "@/lib/constants/index";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import AgencyBankingForm from "@/components/forms/AgencyBankingForm";
import { agencyBankingApi } from "@/services/api/agencyBanking.api";

export default function EditAgencyBankingPage() {
  useAuthGuard(ROLES.BANK_AGENT);
  const { agencyId } = useParams();
  const [item,    setItem]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!agencyId) return;
    agencyBankingApi.getById(agencyId)
      .then(setItem)
      .catch(e => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [agencyId]);

  return (
    <div className="page-container">
      <PageHeader title="Edit Agency Banking Transaction" description="Update transaction details."
        action={<Link href={`/dashboard/agency-banking/${agencyId}`}><Button variant="secondary">← Back</Button></Link>} />
      {loading ? <LoadingSpinner /> :
       error   ? <p className="text-sm text-red-600">{error}</p> :
       !item   ? <p className="text-sm text-slate-500">Transaction not found.</p> :
       <AgencyBankingForm initialData={item} agencyId={agencyId} />}
    </div>
  );
}