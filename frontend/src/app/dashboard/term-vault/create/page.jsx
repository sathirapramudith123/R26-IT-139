"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import TermVaultForm from "@/components/forms/TermVaultForm";
import { termVaultApi } from "@/services/api/termVault.api";

export default function CreateTermVaultPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(values) {
    setLoading(true);
    setError(null);

    try {
      await termVaultApi.create(values);
      router.push("/dashboard/term-vault");
    } catch (err) {
      setError(err.message || "Failed to create vault");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="New Term Vault"
        description="Create a collaborative group savings vault."
        action={
          <Link href="/dashboard/term-vault">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <TermVaultForm
        onSubmit={handleSubmit}
        submitLabel={loading ? "Saving…" : "Create Vault"}
      />
    </div>
  );
}