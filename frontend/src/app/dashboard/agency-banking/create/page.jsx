"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { ROLES } from "@/lib/constants/index";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import AgencyBankingForm from "@/components/forms/AgencyBankingForm";

export default function CreateAgencyBankingPage() {
  useAuthGuard(ROLES.BANK_AGENT);
  return (
    <div className="page-container">
      <PageHeader title="New Agency Banking Transaction"
        description="Simulate a customer deposit, withdrawal, transfer, or inquiry."
        action={<Link href="/dashboard/agency-banking"><Button variant="secondary">← Back</Button></Link>} />
      <AgencyBankingForm />
    </div>
  );
}
