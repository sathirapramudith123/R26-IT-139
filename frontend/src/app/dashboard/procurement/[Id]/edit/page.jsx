"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ProcurementForm from "@/components/forms/ProcurementForm";
import { procurementApi } from "@/services/api/procurement";

export default function EditProcurementPage() {
  useAuthGuard();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    procurementApi.getById(id).then(setItem).catch(e => setError(e.message || "Failed")).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="page-container">
      <PageHeader title="Edit Procurement" description="Update decision details."
        action={<Link href="/dashboard/procurement"><Button variant="secondary">← Back</Button></Link>} />
      {loading ? <LoadingSpinner /> : error ? <p className="text-sm text-red-600">{error}</p> :
       !item ? <p className="text-sm text-slate-500">Not found.</p> :
       <ProcurementForm initialData={item} procurementId={id} />}
    </div>
  );
}