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
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    inventoryApi.getById(id).then(setItem).catch(e => setError(e.message || "Failed")).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="page-container">
      <PageHeader title="Edit Inventory Item" description="Update item details."
        action={<Link href="/dashboard/inventory"><Button variant="secondary">← Back</Button></Link>} />
      {loading ? <LoadingSpinner /> : error ? <p className="text-sm text-red-600">{error}</p> :
       !item ? <p className="text-sm text-slate-500">Not found.</p> :
       <InventoryForm initialData={item} itemId={id} />}
    </div>
  );
}