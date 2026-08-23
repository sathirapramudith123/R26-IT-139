"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import AgencyBankingForm from "@/components/forms/AgencyBankingForm";
import { agencyBankingApi } from "@/services/api/agencyBanking";
import { ArrowLeft, AlertCircle, FileX } from "lucide-react";

export default function EditAgencyBankingPage() {
  useAuthGuard();
  const { Id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!Id) return;
    agencyBankingApi
      .getById(Id)
      .then(setItem)
      .catch((e) => setError(e.message || "Failed to load transaction details."))
      .finally(() => setLoading(false));
  }, [Id]);

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8">
      {/* Header Section */}
      <PageHeader
        title="Edit Transaction"
        description="Update agency banking transaction records and details."
        action={
          <Link href="/dashboard/agency-banking">
            <Button
              variant="secondary"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-all shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      {/* Main Content Area */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <LoadingSpinner />
            <p className="text-sm text-slate-400">Loading transaction details...</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : !item ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-slate-500">
              <FileX className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-400">
              Transaction record not found.
            </p>
          </div>
        ) : (
          <AgencyBankingForm initialData={item} agencyId={Id} />
        )}
      </div>
    </div>
  );
}