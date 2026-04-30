"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import ProcurementForm from "@/components/forms/ProcurementForm";
import { procurementApi } from "@/services/api/procurement.api";

export default function CreateProcurementPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(values) {
    setLoading(true);
    setError(null);

    try {
      await procurementApi.create(values);
      router.push("/dashboard/procurement");
    } catch (err) {
      setError(err.message || "Failed to create procurement decision");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Manual Procurement Decision"
        description="Create a procurement decision manually if needed."
        action={
          <Link href="/dashboard/procurement">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ProcurementForm
        onSubmit={handleSubmit}
        submitLabel={loading ? "Saving..." : "Save Decision"}
      />
    </div>
  );
}