"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { procurementApi } from "@/services/api/procurement.api";

export default function ProcurementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const procurementId = params?.procurementId;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await procurementApi.getById(procurementId);
        setItem(data);
      } catch {
        setItem(null);
      } finally {
        setLoading(false);
      }
    }

    if (procurementId) fetchData();
  }, [procurementId]);

  async function handleDelete() {
    if (!confirm("Delete this procurement decision?")) return;

    try {
      setDeleting(true);
      await procurementApi.remove(procurementId);
      router.push("/dashboard/procurement");
    } catch (err) {
      alert(err.message || "Failed to delete record");
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-LK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Procurement Decision"
        description="Detailed supplier selection and cost decision insights."
        action={
          <Link href="/dashboard/procurement">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading procurement data..." />
      ) : !item ? (
        <Card>
          <p className="text-slate-500">
            Record not found. ID: {procurementId}
          </p>
        </Card>
      ) : (
        <Card className="w-full">
          {/* HEADER */}
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-outfit text-2xl font-bold text-slate-900">
                {item.item_name || "Procurement Decision"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                ID: {item.id}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={item.status} />

              <Link href={`/dashboard/procurement/${item.id}/edit`}>
                <Button size="sm">Edit</Button>
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

          {/* GRID DETAILS */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

            <Info label="Item Name" value={item.item_name} />
            <Info label="Quantity" value={item.quantity} />
            <Info label="Required Date" value={formatDate(item.required_date)} />
            <Info label="Decision Type" value={item.decision_type} />

            <Info label="Selected Supplier" value={item.selected_supplier} />
            <Info label="Supplier Score" value={item.supplier_score} />
            <Info label="Price (LKR)" value={`LKR ${Number(item.price || 0).toLocaleString()}`} />
            <Info label="Total Cost" value={`LKR ${Number(item.total_cost || 0).toLocaleString()}`} />

            <Info label="Delivery Time (Days)" value={item.delivery_time} />
            <Info label="Reliability Score" value={item.reliability_score} />
            <Info label="Decision Status" value={item.status} />
            <Info label="Created Date" value={formatDate(item.created_at)} />

            <Info label="Updated Date" value={formatDate(item.updated_at)} />
            <Info label="Notes" value={item.notes || "—"} />

          </div>

          {/* ALERT */}
          {item.status === "pending" && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This procurement decision is still pending approval.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* REUSABLE INFO BLOCK */
function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800 break-words">
        {String(value || "—").replaceAll("_", " ")}
      </p>
    </div>
  );
}