"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import AgencyBankingForm from "@/components/forms/AgencyBankingForm";

export default function CreateAgencyBankingPage() {
  useAuthGuard();
  return (
    <div className="page-container">
      <PageHeader title="New Agency Banking Transaction" description="Record a deposit, withdrawal, or transfer."
        action={<Link href="/dashboard/agency-banking"><Button variant="secondary">← Back</Button></Link>} />
      <AgencyBankingForm />
    </div>
  );
}