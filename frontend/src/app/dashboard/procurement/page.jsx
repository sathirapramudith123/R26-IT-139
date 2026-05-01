"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import RecommendationPanel from "@/components/procurement/RecommendationPanel";
import useProcurement from "@/hooks/useProcurement";
import { procurementApi } from "@/services/api/procurement.api";

const COLUMNS = [
  { key: "item_name", label: "Item" },
  { key: "recommended_supplier_name", label: "Supplier" },
  { key: "recommended_quantity", label: "Recommended Qty" },
  { key: "supplier_score", label: "Supplier Score" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

export default function ProcurementPage() {
  const {
    items,
    recommendations,
    loading,
    recommendationLoading,
    error,
    fetchAll,
    fetchRecommendations,
    saveDecision,
  } = useProcurement();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchAll();
    fetchRecommendations();
  }, [fetchAll, fetchRecommendations]);

  async function handleSaveDecision(payload) {
    setSuccess(null);

    try {
      await saveDecision(payload);
      setSuccess("Procurement decision saved successfully.");
    } catch (err) {
      alert(err.message || "Failed to save decision");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this procurement decision?")) {
      return;
    }

    try {
      await procurementApi.delete(id);
      await fetchAll();
      setSuccess("Procurement decision deleted successfully.");
    } catch (err) {
      alert(err.message || "Failed to delete procurement decision");
    }
  }

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.item_name?.toLowerCase().includes(keyword) ||
        item.recommended_supplier_name?.toLowerCase().includes(keyword) ||
        item.status?.toLowerCase().includes(keyword) ||
        item.id?.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        item.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

    const rows = filteredItems.map((item) => ({
      ...item,

      status: <StatusBadge status={item.status} />,

      actions: (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/procurement/${item.id}`}>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>

          <Link href={`/dashboard/procurement/${item.id}/edit`}>
            <Button variant="secondary" size="sm">
              Edit
            </Button>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDelete(item.id)}
          >
            Delete
          </Button>
        </div>
      ),
    }));

  return (
    <div className="page-container">
      <PageHeader
        title="Smart Procurement Decision Support"
        description="Generate reorder recommendations using stock levels and supplier scoring."
        action={
          <Link href="/dashboard/procurement/create">
            <Button>+ Manual Decision</Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <RecommendationPanel
        recommendations={recommendations}
        loading={recommendationLoading}
        onRefresh={fetchRecommendations}
        onSaveDecision={handleSaveDecision}
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="text"
            placeholder="Search saved decisions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 lg:max-w-md"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>

            {(searchTerm || statusFilter !== "all") && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner label="Loading procurement decisions..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon="🧠"
          title="No saved procurement decisions"
          description="Generate recommendations and save them as decision records."
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No matching decisions"
          description="Try changing your search or filter."
        />
      ) : (
        <Table columns={COLUMNS} rows={rows} />
      )}
    </div>
  );
}