"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ProcurementForm from "@/components/forms/ProcurementForm";
import { procurementApi } from "@/services/api/procurement.api";

export default function EditProcurementPage() {
  const params = useParams();
  const router = useRouter();
  const procurementId = params?.procurementId;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!procurementId) return;

    procurementApi
      .getById(procurementId)
      .then(setItem)
      .catch(() => setError("Failed to load procurement decision"))
      .finally(() => setLoading(false));
  }, [procurementId]);

  async function handleSubmit(values) {
    setSaving(true);
    setError(null);

    try {
      await procurementApi.update(procurementId, values);
      router.push(`/dashboard/procurement/${procurementId}`);
    } catch (err) {
      setError(err.message || "Failed to update procurement decision");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Update Procurement Decision"
        description="Edit smart procurement decision details."
        action={
          <Link href={`/dashboard/procurement/${procurementId}`}>
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <ProcurementForm
          initialData={item || {}}
          onSubmit={handleSubmit}
          submitLabel={saving ? "Updating..." : "Update Decision"}
        />
      )}
    </div>
  );
}