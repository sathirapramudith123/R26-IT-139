"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { inventoryApi } from "@/services/api/inventory.api";

export default function InventoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id || params?.inventoryId;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-LK", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  useEffect(() => {
    async function fetchItem() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const data = await inventoryApi.getById(id);
        setItem(data);
      } catch {
        setItem(null);
      } finally {
        setLoading(false);
      }
    }

    fetchItem();
  }, [id]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await inventoryApi.remove(id);
      router.push("/dashboard/inventory");
    } catch (err) {
      alert(err.message || "Failed to delete item");
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Details"
        description="Full details for this stock item."
        action={
          <Link href="/dashboard/inventory">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading item..." />
      ) : !item ? (
        <Card>
          <p className="text-slate-500">Item not found. ID: {id}</p>
        </Card>
      ) : (
        <Card className="max-w-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="font-outfit text-xl font-bold text-slate-900">
              {item.name}
            </h2>

            {item.status && <StatusBadge status={item.status} />}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Supplier", value: item.supplier_name ?? "Unknown Supplier" },
              { label: "Quantity", value: item.quantity ?? "—" },
              { label: "Unit", value: item.unit ?? "unit" },
              {
                label: "Unit Price",
                value:
                  item.unit_price != null
                    ? `LKR ${Number(item.unit_price).toLocaleString()}`
                    : "—"
              },
              { label: "Created", value: formatDate(item.created_at) },
              { label: "Last Updated", value: formatDate(item.updated_at) }
            ].map((d) => (
              <div key={d.label} className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">{d.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  {d.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <Link href={`/dashboard/inventory/${id}/edit`}>
              <Button>Edit Item</Button>
            </Link>

            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}