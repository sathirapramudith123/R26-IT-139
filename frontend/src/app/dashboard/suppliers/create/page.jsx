"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import SupplierForm from "@/components/forms/SupplierForm";

export default function CreateSupplierPage() {
  useAuthGuard();
  return (
    <div className="page-container">
      <PageHeader title="Add Supplier" description="Register a new supplier."
        action={<Link href="/dashboard/suppliers"><Button variant="secondary">← Back</Button></Link>} />
      <SupplierForm />
    </div>
  );
}