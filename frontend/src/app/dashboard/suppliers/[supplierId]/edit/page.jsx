"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import SupplierForm from "@/components/forms/SupplierForm";
import { supplierApi } from "@/services/api/supplier.api";

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id || params?.supplierId;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSupplier() {
      if (!id) {
        setError("Supplier ID not found in URL.");
        setLoading(false);
        return;
      }

      try {
        const data = await supplierApi.getById(id);
        setItem(data);
      } catch (err) {
        setError(err.message || "Failed to load supplier");
      } finally {
        setLoading(false);
      }
    }

    fetchSupplier();
  }, [id]);

  async function handleSubmit(values) {
    setSaving(true);
    setError(null);

    try {
      await supplierApi.update(id, values);
      router.push("/dashboard/suppliers");
    } catch (err) {
      setError(err.message || "Failed to update supplier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Edit Supplier"
        description="Update supplier details."
        action={
          <Link href="/dashboard/suppliers">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading supplier..." />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : !item ? (
        <Card>
          <p className="text-sm text-slate-500">Supplier not found.</p>
        </Card>
      ) : (
        <SupplierForm
          initialData={item}
          onSubmit={handleSubmit}
          submitLabel={saving ? "Updating..." : "Update Supplier"}
        />
      )}
    </div>
  );
}