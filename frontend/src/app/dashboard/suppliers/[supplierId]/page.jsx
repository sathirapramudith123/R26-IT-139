"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { supplierApi } from "@/services/api/supplier.api";

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id || params?.supplierId;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSupplier() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const data = await supplierApi.getById(id);
        setItem(data);
      } catch {
        setItem(null);
      } finally {
        setLoading(false);
      }
    }

    fetchSupplier();
  }, [id]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this supplier?")) return;

    try {
      await supplierApi.remove(id);
      router.push("/dashboard/suppliers");
    } catch (err) {
      alert(err.message || "Failed to delete supplier");
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Supplier Details"
        description="Full details for this supplier."
        action={
          <Link href="/dashboard/suppliers">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading supplier..." />
      ) : !item ? (
        <Card>
          <p className="text-slate-500">Supplier not found. ID: {id}</p>
        </Card>
      ) : (
        <Card className="max-w-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="font-outfit text-xl font-bold text-slate-900">
              {item.name}
            </h2>

            {item.status && <StatusBadge status={item.status} />}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Company", value: item.company_name ?? "N/A" },
              { label: "Contact", value: item.contact_number ?? "—" },
              { label: "Email", value: item.email ?? "N/A" },
              { label: "Address", value: item.address ?? "—" },
              { label: "Supplier ID", value: item.id ?? "—" },
              {
                label: "Created",
                value: item.created_at
                  ? new Date(item.created_at).toLocaleDateString("en-LK")
                  : "—"
              },
              {
                label: "Last Updated",
                value: item.updated_at
                  ? new Date(item.updated_at).toLocaleDateString("en-LK")
                  : "—"
              }
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
            <Link href={`/dashboard/suppliers/${id}/edit`}>
              <Button>Edit Supplier</Button>
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