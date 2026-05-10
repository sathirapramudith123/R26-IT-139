"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LedgerForm from "@/components/forms/LedgerForm";

export default function CreateLedgerPage() {
  useAuthGuard();
  return (
    <div className="page-container">
      <PageHeader title="New Ledger Entry" description="Record a manual income or expense entry."
        action={<Link href="/dashboard/ledger"><Button variant="secondary">← Back</Button></Link>} />
      <LedgerForm />
    </div>
  );
}