"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import ProcurementForm from "@/components/forms/ProcurementForm";

export default function CreateProcurementPage() {
  useAuthGuard();
  return (
    <div className="page-container">
      <PageHeader title="New Procurement Decision" description="Record a procurement decision."
        action={<Link href="/dashboard/procurement"><Button variant="secondary">← Back</Button></Link>} />
      <ProcurementForm />
    </div>
  );
}