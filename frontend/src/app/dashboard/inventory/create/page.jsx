"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import InventoryForm from "@/components/forms/InventoryForm";
import { inventoryApi } from "@/services/api/inventory.api";
import { supplierApi } from "@/services/api/supplier.api";

export default function CreateInventoryPage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const data = await supplierApi.list();
        setSuppliers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Failed to load suppliers");
      } finally {
        setLoadingSuppliers(false);
      }
    }

    fetchSuppliers();
  }, []);

  async function handleSubmit(values) {
    setSaving(true);
    setError(null);

    try {
      await inventoryApi.create(values);
      router.push("/dashboard/inventory");
    } catch (err) {
      setError(err.message || "Failed to create item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Add Inventory Item"
        description="Add a new stock item and select the relevant supplier."
        action={
          <Link href="/dashboard/inventory">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loadingSuppliers ? (
        <LoadingSpinner label="Loading suppliers..." />
      ) : suppliers.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            No suppliers found. Please add a supplier first.
          </p>

          <div className="mt-4">
            <Link href="/dashboard/suppliers/create">
              <Button>Add Supplier</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <InventoryForm
          suppliers={suppliers}
          onSubmit={handleSubmit}
          submitLabel={saving ? "Saving..." : "Add Item"}
        />
      )}
    </div>
  );
}