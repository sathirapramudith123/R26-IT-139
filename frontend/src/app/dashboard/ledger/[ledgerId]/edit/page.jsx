"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LedgerForm from "@/components/forms/LedgerForm";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { ledgerApi } from "@/services/api/ledger.api";

export default function EditLedgerPage() {
  const { ledgerId } = useParams();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLedger() {
      try {
        setLoading(true);
        const data = await ledgerApi.getById(ledgerId);
        setItem(data);
      } catch (err) {
        setError(err.message || "Failed to load ledger entry");
      } finally {
        setLoading(false);
      }
    }

    if (ledgerId) loadLedger();
  }, [ledgerId]);

  async function handleSubmit(values) {
    try {
      setSaving(true);
      setError("");

      await ledgerApi.update(ledgerId, values);

      router.push(`/dashboard/ledger/${ledgerId}`);
      router.refresh();
    } catch (err) {
      setError(err.message || "Failed to update ledger entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Edit Ledger Entry"
        description="Update financial ledger information."
        action={
          <Link href={`/dashboard/ledger/${ledgerId}`}>
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
        <LoadingSpinner label="Loading ledger entry..." />
      ) : !item ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Ledger entry not found.
        </div>
      ) : (
        <LedgerForm
          initialData={item}
          onSubmit={handleSubmit}
          submitLabel={saving ? "Updating..." : "Update Entry"}
        />
      )}
    </div>
  );
}