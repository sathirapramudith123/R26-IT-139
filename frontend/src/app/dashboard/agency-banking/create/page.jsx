"use client";

import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import AgencyBankingForm from "@/components/forms/AgencyBankingForm";
import { ArrowLeft } from "lucide-react";

export default function CreateAgencyBankingPage() {
  useAuthGuard();

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8">
      {/* Header Section */}
      <PageHeader
        title="New Agency Banking Transaction"
        description="Record a deposit, withdrawal, or transfer."
        action={
          <Link href="/dashboard/agency-banking">
            <Button
              variant="secondary"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-all shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      {/* Main Content Area */}
      <AgencyBankingForm />
    </div>
  );
}