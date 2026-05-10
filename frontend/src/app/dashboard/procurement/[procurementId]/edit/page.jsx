"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ProcurementForm from "@/components/forms/ProcurementForm";
import { procurementApi } from "@/services/api/procurement.api";

export default function EditProcurementPage() {
  useAuthGuard();
  const { procurementId } = useParams();
  const [item,    setItem]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!procurementId) return;
    procurementApi.getById(procurementId)
      .then(setItem)
      .catch(e => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [procurementId]);

  return (
    <div className="page-container">
      <PageHeader title="Update Procurement Decision" description="Edit procurement decision details."
        action={<Link href={`/dashboard/procurement/${procurementId}`}><Button variant="secondary">← Back</Button></Link>} />
      {loading ? <LoadingSpinner /> :
       error   ? <p className="text-sm text-red-600">{error}</p> :
       !item   ? <p className="text-sm text-slate-500">Record not found.</p> :
       <ProcurementForm initialData={item} procurementId={procurementId} />}
    </div>
  );
}