"use client";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import InventoryForm from "@/components/forms/InventoryForm";

export default function CreateInventoryPage() {
  useAuthGuard();
  return (
    <div className="page-container">
      <PageHeader title="Add Inventory Item" description="Add a new stock item."
        action={<Link href="/dashboard/inventory"><Button variant="secondary">← Back</Button></Link>} />
      <InventoryForm />
    </div>
  );
}