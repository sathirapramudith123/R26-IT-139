"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import InventoryForm from "@/components/forms/InventoryForm";
import { inventoryApi } from "@/services/api/inventory.api";
import { supplierApi } from "@/services/api/supplier.api";

export default function EditInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id || params?.inventoryId;

  const [item, setItem] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) {
        setError("Inventory ID not found in URL.");
        setLoading(false);
        return;
      }

      try {
        const [inventoryData, supplierData] = await Promise.all([
          inventoryApi.getById(id),
          supplierApi.list()
        ]);

        setItem(inventoryData);
        setSuppliers(Array.isArray(supplierData) ? supplierData : []);
      } catch (err) {
        setError(err.message || "Failed to load inventory details");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  async function handleSubmit(values) {
    setSaving(true);
    setError(null);

    try {
      await inventoryApi.update(id, values);
      router.push("/dashboard/inventory");
    } catch (err) {
      setError(err.message || "Failed to update item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Edit Inventory Item"
        description="Update item details and relevant supplier."
        action={
          <Link href="/dashboard/inventory">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading inventory item..." />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : !item ? (
        <Card>
          <p className="text-sm text-slate-500">Inventory item not found.</p>
        </Card>
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
          initialData={item}
          suppliers={suppliers}
          onSubmit={handleSubmit}
          submitLabel={saving ? "Updating..." : "Update Item"}
        />
      )}
    </div>
  );
}