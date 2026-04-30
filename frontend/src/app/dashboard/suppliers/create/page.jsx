"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import SupplierForm from "@/components/forms/SupplierForm";
import { supplierApi } from "@/services/api/supplier.api";

export default function CreateSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(values) {
    setLoading(true);
    setError(null);

    try {
      await supplierApi.create(values);
      router.push("/dashboard/suppliers");
    } catch (err) {
      setError(err.message || "Failed to add supplier");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Add Supplier"
        description="Register a new supplier in your network."
        action={
          <Link href="/dashboard/suppliers">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <SupplierForm
        onSubmit={handleSubmit}
        submitLabel={loading ? "Saving..." : "Add Supplier"}
      />
    </div>
  );
}