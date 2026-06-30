"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import SupplierForm from "@/components/forms/SupplierForm";
import { supplierApi } from "@/services/api/supplier";

export default function EditSupplierPage() {
  useAuthGuard();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    supplierApi.getById(id).then(setItem).catch(e => setError(e.message || "Failed")).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="page-container">
      <PageHeader title="Edit Supplier" description="Update supplier details."
        action={<Link href="/dashboard/suppliers"><Button variant="secondary">← Back</Button></Link>} />
      {loading ? <LoadingSpinner /> : error ? <p className="text-sm text-red-600">{error}</p> :
       !item ? <p className="text-sm text-slate-500">Not found.</p> :
       <SupplierForm initialData={item} supplierId={id} />}
    </div>
  );
}