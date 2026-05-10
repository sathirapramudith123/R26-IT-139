"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useSuppliers from "@/hooks/useSuppliers";

export default function CompareSupplierPage() {
  const { items: suppliers, loading, error, fetchAll } = useSuppliers();
  const [sortKey, setSortKey] = useState("total_score");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    let list =
      filterStatus === "all"
        ? suppliers
        : suppliers.filter((s) => s.status === filterStatus);

    return [...list].sort((a, b) => {
      const av = Number(a[sortKey] ?? 0);
      const bv = Number(b[sortKey] ?? 0);
      // For unit_price and delivery_cost, lower is better — sort ascending
      if (sortKey === "unit_price" || sortKey === "delivery_cost") {
        return av - bv;
      }
      return bv - av;
    });
  }, [suppliers, sortKey, filterStatus]);

  const best = filtered[0] ?? null;

  // Score bar
  function ScoreBar({ value, max = 100, color = "bg-primary-500" }) {
    const pct = Math.min(100, Math.max(0, (Number(value ?? 0) / max) * 100));
    return (
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }

  function scoreColor(score) {
    const s = Number(score ?? 0);
    if (s >= 75) return "text-emerald-600";
    if (s >= 50) return "text-amber-600";
    return "text-red-500";
  }

  function ScoreCell({ label, value, max = 100, barColor }) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span className={`font-semibold ${scoreColor(value)}`}>
            {Number(value ?? 0).toFixed(1)}
          </span>
        </div>
        <ScoreBar value={value} max={max} color={barColor} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Supplier Comparison"
        description="Compare performance, pricing, and delivery across your suppliers."
        action={
          <Link href="/dashboard/suppliers">
            <Button variant="secondary">← All Suppliers</Button>
          </Link>
        }
      />

      {/* Controls */}
      {!loading && suppliers.length > 0 && (
        <Card className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">
                  Sort by
                </label>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                >
                  <option value="total_score">Total Score (best first)</option>
                  <option value="price_score">Price Score</option>
                  <option value="reliability_score">Reliability Score</option>
                  <option value="delivery_score">Delivery Score</option>
                  <option value="unit_price">Unit Price (lowest first)</option>
                  <option value="delivery_cost">
                    Delivery Cost (lowest first)
                  </option>
                  <option value="available_quantity">
                    Available Quantity (most first)
                  </option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>

            <p className="text-sm text-slate-400">
              {filtered.length} supplier{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </Card>
      )}

      {/* Best supplier badge */}
      {best && !loading && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="text-base">🏆</span>
          <span>
            Best match for <strong>{sortKey.replaceAll("_", " ")}</strong>:{" "}
            <strong>{best.name}</strong>{" "}
            <span className="text-xs text-emerald-600">
              ({best.company_name})
            </span>
          </span>
          <Link
            href={`/dashboard/suppliers/${best.id}`}
            className="ml-auto text-xs font-medium underline"
          >
            View
          </Link>
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading suppliers..." />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="No suppliers found"
          description="Add suppliers to start comparing performance."
          action={
            <Link href="/dashboard/suppliers/create">
              <Button>Add Supplier</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No suppliers match this filter"
          description="Try a different status filter."
          action={
            <Button
              variant="secondary"
              onClick={() => setFilterStatus("all")}
            >
              Clear Filter
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((supplier, idx) => (
            <Card key={supplier.id} className="relative">
              {/* Rank badge */}
              <div
                className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  idx === 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                #{idx + 1}
              </div>

              {/* Header */}
              <div className="mb-4 pr-8">
                <h3 className="font-outfit text-base font-bold text-slate-900">
                  {supplier.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {supplier.company_name}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    supplier.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : supplier.status === "blacklisted"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {supplier.status}
                </span>
              </div>

              {/* Performance scores */}
              <div className="mb-4 space-y-3">
                <ScoreCell
                  label="Price Score"
                  value={supplier.price_score}
                  barColor="bg-blue-400"
                />
                <ScoreCell
                  label="Reliability Score"
                  value={supplier.reliability_score}
                  barColor="bg-purple-400"
                />
                <ScoreCell
                  label="Delivery Score"
                  value={supplier.delivery_score}
                  barColor="bg-teal-400"
                />

                <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Total Score
                  </span>
                  <span
                    className={`text-lg font-bold ${scoreColor(
                      supplier.total_score
                    )}`}
                  >
                    {Number(supplier.total_score ?? 0).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Procurement details */}
              <div className="mb-4 grid grid-cols-3 gap-2">
                <ProcureCell
                  label="Unit Price"
                  value={`LKR ${Number(
                    supplier.unit_price ?? 0
                  ).toLocaleString()}`}
                />
                <ProcureCell
                  label="Delivery Cost"
                  value={`LKR ${Number(
                    supplier.delivery_cost ?? 0
                  ).toLocaleString()}`}
                />
                <ProcureCell
                  label="Available Qty"
                  value={Number(
                    supplier.available_quantity ?? 0
                  ).toLocaleString()}
                />
              </div>

              {/* Estimated delivery */}
              {supplier.estimated_delivery_date && (
                <p className="mb-3 text-xs text-slate-400">
                  Est. delivery:{" "}
                  {new Date(
                    supplier.estimated_delivery_date
                  ).toLocaleDateString("en-LK", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Link href={`/dashboard/suppliers/${supplier.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
                <Link href={`/dashboard/suppliers/${supplier.id}/edit`}>
                  <Button variant="primary" size="sm">
                    Edit
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProcureCell({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-xs font-semibold text-slate-700">{value}</p>
    </div>
  );
}