"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import SupplierForm from "@/components/forms/SupplierForm";
import { supplierApi } from "@/services/api/supplier.api";

export default function EditSupplierPage() {
  useAuthGuard();
  const { supplierId } = useParams();
  const router = useRouter();
  const [item,    setItem]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!supplierId) return;
    supplierApi.getById(supplierId)
      .then(setItem)
      .catch(e => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [supplierId]);

  async function handleSubmit(values) {
    setError(null);
    try {
      await supplierApi.update(supplierId, values);
      router.push("/dashboard/suppliers");
    } catch (e) {
      setError(e.message || "Failed to update supplier");
      throw e;
    }
  }

  return (
    <div className="page-container">
      <PageHeader title="Edit Supplier" description="Update supplier details and performance scores."
        action={<Link href="/dashboard/suppliers"><Button variant="secondary">← Back</Button></Link>} />
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {loading ? <LoadingSpinner /> :
       !item   ? <p className="text-sm text-slate-500">Supplier not found.</p> :
       <SupplierForm initialData={item} onSubmit={handleSubmit} submitLabel="Update Supplier" />}
    </div>
  );
}