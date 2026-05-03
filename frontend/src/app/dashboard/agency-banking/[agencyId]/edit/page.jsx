"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import AgencyBankingForm from "@/components/forms/AgencyBankingForm";
import { agencyBankingApi } from "@/services/api/agencyBanking.api";

export default function EditAgencyBankingPage() {
  const { agencyId } = useParams();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRecord() {
      try {
        setLoading(true);
        const data = await agencyBankingApi.getById(agencyId);
        setItem(data);
      } catch (err) {
        setError(err.message || "Failed to load agency banking transaction");
      } finally {
        setLoading(false);
      }
    }

    if (agencyId) loadRecord();
  }, [agencyId]);

  async function handleSubmit(values) {
    try {
      setSaving(true);
      setError("");

      await agencyBankingApi.update(agencyId, values);

      router.push(`/dashboard/agency-banking/${agencyId}`);
      router.refresh();
    } catch (err) {
      setError(err.message || "Failed to update agency banking transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Edit Agency Banking Transaction"
        description="Update simulated banking transaction details."
        action={
          <Link href={`/dashboard/agency-banking/${agencyId}`}>
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
        <LoadingSpinner label="Loading agency banking transaction..." />
      ) : (
        <AgencyBankingForm
          initialData={item || {}}
          onSubmit={handleSubmit}
          submitLabel={saving ? "Updating..." : "Update Transaction"}
        />
      )}
    </div>
  );
}