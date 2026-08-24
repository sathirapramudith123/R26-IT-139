"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import InventoryForm from "@/components/forms/InventoryForm";
import { inventoryApi } from "@/services/api/inventory";

export default function EditInventoryPage() {
  useAuthGuard();
  const { Id } = useParams();          // ← capital Id, matches [Id] folder
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!Id) return;
    inventoryApi.getById(Id)
      .then(setItem)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [Id]);

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Inventory Item" description="Update the details."
        action={<Link href="/dashboard/inventory"><Button variant="outline">← Back</Button></Link>} />
      {loading ? <LoadingSpinner /> :
       error ? <p className="text-red-500">{error}</p> :
       !item ? <p className="text-soft">Not found.</p> :
       <InventoryForm initialData={item} itemId={Id} />}
    </div>
  );
}