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
  const inventoryId = params?.inventoryId;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchItem() {
      try {
        const data = await inventoryApi.getById(inventoryId);
        setItem(data);
      } catch {
        setItem(null);
      } finally {
        setLoading(false);
      }
    }

    if (inventoryId) fetchItem();
  }, [inventoryId]);

  async function handleDelete() {
    if (!confirm("Delete this inventory item?")) return;

    try {
      setDeleting(true);
      await inventoryApi.remove(inventoryId);
      router.push("/dashboard/inventory");
    } catch (err) {
      alert(err.message || "Failed to delete inventory item");
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-LK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory Details"
        description="View stock, supplier, and reorder details."
        action={
          <Link href="/dashboard/inventory">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading inventory item..." />
      ) : !item ? (
        <Card>
          <p className="text-slate-500">
            Inventory item not found. ID: {inventoryId}
          </p>
        </Card>
      ) : (
        <Card className="w-full">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-outfit text-2xl font-bold text-slate-900">
                {item.name}
              </h2>
              <p className="mt-1 text-xs text-slate-400">ID: {item.id}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={item.status} />

              <Link href={`/dashboard/inventory/${item.id}/edit`}>
                <Button variant="primary" size="sm">
                  Edit
                </Button>
              </Link>

              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Supplier" value={item.supplier_name || "Unknown Supplier"} />
            <Info label="Supplier ID" value={item.supplier_id || "—"} />
            <Info label="Quantity" value={item.quantity ?? "—"} />
            <Info label="Reorder Level" value={item.reorder_level ?? "—"} />

            <Info label="Unit" value={item.unit || "unit"} />
            <Info
              label="Unit Price"
              value={`LKR ${Number(item.unit_price || 0).toLocaleString()}`}
            />
            <Info
              label="Stock Value"
              value={`LKR ${Number(
                (item.quantity || 0) * (item.unit_price || 0)
              ).toLocaleString()}`}
            />
            <Info label="Stock Status" value={item.status || "—"} />

            <Info label="Sync Status" value={item.sync_status || "synced"} />
            <Info label="Created" value={formatDate(item.created_at)} />
            <Info label="Updated" value={formatDate(item.updated_at)} />
          </div>

          {Number(item.quantity || 0) <= Number(item.reorder_level || 0) && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Low stock detected. This item has reached or passed the reorder level.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">
        {String(value).replaceAll("_", " ")}
      </p>
    </div>
  );
}