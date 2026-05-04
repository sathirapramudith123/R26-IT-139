"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { transactionApi } from "@/services/api/transaction.api";

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();

  const transactionId = params?.transactionId || params?.id;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchItem() {
      if (!transactionId) {
        setLoading(false);
        return;
      }

      try {
        const data = await transactionApi.getById(transactionId);
        setItem(data);
      } catch {
        setItem(null);
      } finally {
        setLoading(false);
      }
    }

    fetchItem();
  }, [transactionId]);

  async function handleDelete() {
    if (!confirm("Delete this transaction?")) return;

    try {
      setDeleting(true);
      await transactionApi.remove(transactionId);
      router.push("/dashboard/transactions");
    } catch (err) {
      alert(err.message || "Failed to delete transaction");
    } finally {
      setDeleting(false);
    }
  }

  function formatMoney(value) {
    return `LKR ${Number(value || 0).toLocaleString()}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-LK");
  }

  function isIncome(type) {
    return ["sale", "deposit"].includes(type);
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Transaction Details"
        description="Detailed financial transaction record."
        action={
          <Link href="/dashboard/transactions">
            <Button variant="secondary">← Back</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading transaction..." />
      ) : !item ? (
        <Card>
          <p className="text-slate-500">
            Transaction not found. ID: {transactionId}
          </p>
        </Card>
      ) : (
        <Card className="w-full">

          {/* 🔥 HEADER */}
          <div className="mb-6 flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-outfit text-2xl font-bold text-slate-900 capitalize">
                {item.transaction_type?.replaceAll("_", " ")}
              </h2>
              <p className="mt-1 text-xs text-slate-400">ID: {item.id}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={item.status} />

              <Link href={`/dashboard/transactions/${item.id}/edit`}>
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

          {/* 📊 HORIZONTAL GRID */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

            <Info label="Transaction Type" value={item.transaction_type} />
            <Info label="Category" value={item.category} />
            <Info label="Payment Method" value={item.payment_method} />

            <Info
              label="Amount"
              value={formatMoney(item.amount)}
              highlight={true}
              positive={isIncome(item.transaction_type)}
            />

            <Info label="Description" value={item.description} />
            <Info label="Notes" value={item.notes || "—"} />

            <Info label="Status" value={item.status} />
            <Info label="Date" value={formatDate(item.date)} />

            <Info label="Created At" value={formatDate(item.created_at)} />
            <Info label="Updated At" value={formatDate(item.updated_at)} />

          </div>

          {/* 💡 SMART INSIGHT (Research Alignment) */}
          {isIncome(item.transaction_type) && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              This transaction contributes to **income flow**, improving liquidity visibility.
            </div>
          )}

          {!isIncome(item.transaction_type) && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This transaction represents an **outflow**, impacting working capital.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Info({ label, value, highlight, positive }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-400">{label}</p>

      <p
        className={`mt-0.5 text-sm font-semibold capitalize ${
          highlight
            ? positive
              ? "text-green-600"
              : "text-red-500"
            : "text-slate-800"
        }`}
      >
        {String(value || "—").replaceAll("_", " ")}
      </p>
    </div>
  );
}