"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { ledgerApi } from "@/services/api/ledger.api";

export default function LedgerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ledgerId = params?.ledgerId;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchLedger() {
      try {
        const data = await ledgerApi.getById(ledgerId);
        setItem(data);
      } catch {
        setItem(null);
      } finally {
        setLoading(false);
      }
    }

    if (ledgerId) fetchLedger();
  }, [ledgerId]);

  async function handleDelete() {
    if (!confirm("Delete this ledger entry?")) return;

    try {
      setDeleting(true);
      await ledgerApi.delete(ledgerId);
      router.push("/dashboard/ledger");
    } catch (err) {
      alert(err.message || "Failed to delete ledger entry");
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
        title="Ledger Entry Details"
        description="View financial entry details, category, payment method, and audit dates."
        action={
          <Link href="/dashboard/ledger">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading ledger entry..." />
      ) : !item ? (
        <Card>
          <p className="text-slate-500">Ledger entry not found. ID: {ledgerId}</p>
        </Card>
      ) : (
        <Card className="w-full">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-outfit text-2xl font-bold text-slate-900">
                {item.title}
              </h2>
              <p className="mt-1 text-xs text-slate-400">ID: {item.id}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={item.status} />

              <Link href={`/dashboard/ledger/${item.id}/edit`}>
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
            <Info
              label="Amount"
              value={`LKR ${Number(item.amount || 0).toLocaleString()}`}
            />
            <Info label="Entry Type" value={item.entry_type || "—"} />
            <Info label="Category" value={item.category || "—"} />
            <Info label="Payment Method" value={item.payment_method || "—"} />

            <Info label="Source Transaction ID" value={item.source_transaction_id || "—"} />
            <Info label="Status" value={item.status || "—"} />
            <Info label="Created" value={formatDate(item.created_at)} />
            <Info label="Updated" value={formatDate(item.updated_at)} />
          </div>
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