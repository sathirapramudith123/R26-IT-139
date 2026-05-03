"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import AgencyBankingForm from "@/components/forms/AgencyBankingForm";
import { agencyBankingApi } from "@/services/api/agencyBanking.api";

export default function CreateAgencyBankingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(values) {
    try {
      setLoading(true);
      setError("");

      await agencyBankingApi.create(values);

      router.push("/dashboard/agency-banking");
    } catch (err) {
      setError(err.message || "Failed to create agency banking transaction");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="New Agency Banking Transaction"
        description="Simulate customer deposit, withdrawal, transfer, or bill payment."
        action={
          <Link href="/dashboard/agency-banking">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <AgencyBankingForm
        onSubmit={handleSubmit}
        submitLabel={loading ? "Saving..." : "Create Transaction"}
      />
    </div>
  );
}