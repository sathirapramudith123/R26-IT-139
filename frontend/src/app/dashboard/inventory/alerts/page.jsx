"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useInventory from "@/hooks/useInventory";

const COLUMNS = [
  { key: "name", label: "Item Name" },
  { key: "supplier_name", label: "Supplier" },
  { key: "quantity", label: "Current Qty" },
  { key: "reorder_level", label: "Reorder Level" },
  { key: "deficit", label: "Deficit" },
  { key: "unit", label: "Unit" },
  { key: "unit_price", label: "Unit Price (LKR)" },
  { key: "restock_cost", label: "Est. Restock Cost" },
  { key: "actions", label: "" },
];

export default function AlertsPage() {
  const { items, loading, error, fetchAll } = useInventory();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Only items at or below reorder level
  const lowStockItems = useMemo(
    () => items.filter((i) => i.status === "low_stock"),
    [items]
  );

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return lowStockItems;
    return lowStockItems.filter(
      (item) =>
        item.name?.toLowerCase().includes(keyword) ||
        item.supplier_name?.toLowerCase().includes(keyword) ||
        item.unit?.toLowerCase().includes(keyword)
    );
  }, [lowStockItems, searchTerm]);

  // Summary stats
  const totalDeficitCost = useMemo(
    () =>
      lowStockItems.reduce((sum, item) => {
        const deficit = Math.max(
          0,
          (item.reorder_level ?? 0) - (item.quantity ?? 0)
        );
        return sum + deficit * (item.unit_price ?? 0);
      }, 0),
    [lowStockItems]
  );

  const rows = filteredItems.map((item) => {
    const deficit = Math.max(
      0,
      (item.reorder_level ?? 0) - (item.quantity ?? 0)
    );
    const restockCost = deficit * (item.unit_price ?? 0);

    return {
      ...item,
      supplier_name: item.supplier_name ?? "Unknown",
      unit: item.unit ?? "unit",
      quantity: (
        <span className="font-semibold text-red-600">
          {item.quantity ?? 0}
        </span>
      ),
      reorder_level: item.reorder_level ?? 0,
      deficit: (
        <span className="font-semibold text-amber-700">
          {deficit > 0 ? `-${deficit}` : "At limit"}
        </span>
      ),
      unit_price: `LKR ${Number(item.unit_price ?? 0).toLocaleString()}`,
      restock_cost:
        restockCost > 0
          ? `LKR ${Number(restockCost).toLocaleString()}`
          : "—",
      actions: (
        <div className="flex gap-2">
          <Link href={`/dashboard/inventory/${item.id}/edit`}>
            <Button variant="primary" size="sm">
              Restock
            </Button>
          </Link>
          <Link href={`/dashboard/inventory/${item.id}`}>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>
        </div>
      ),
    };
  });

  return (
    <div className="page-container">
      <PageHeader
        title="Low Stock Alerts"
        description="Items that have reached or passed their reorder level."
        action={
          <Link href="/dashboard/inventory">
            <Button variant="secondary">← All Inventory</Button>
          </Link>
        }
      />

      {/* Summary cards */}
      {!loading && lowStockItems.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Low stock items"
            value={lowStockItems.length}
            color="text-red-600"
          />
          <SummaryCard
            label="Items with deficit"
            value={
              lowStockItems.filter(
                (i) => (i.reorder_level ?? 0) - (i.quantity ?? 0) > 0
              ).length
            }
            color="text-amber-700"
          />
          <SummaryCard
            label="Est. restock cost"
            value={`LKR ${Number(totalDeficitCost).toLocaleString()}`}
            color="text-slate-800"
          />
        </div>
      )}

      {/* Search */}
      {!loading && lowStockItems.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search by item name, supplier, or unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
            {searchTerm && (
              <Button variant="secondary" onClick={() => setSearchTerm("")}>
                Clear
              </Button>
            )}
          </div>
        </Card>
      )}

      {loading ? (
        <LoadingSpinner label="Checking stock levels..." />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : lowStockItems.length === 0 ? (
        <EmptyState
          icon="✅"
          title="All stock levels are healthy"
          description="No items have reached their reorder level."
          action={
            <Link href="/dashboard/inventory">
              <Button>View All Inventory</Button>
            </Link>
          }
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No matching alerts"
          description="Try a different search term."
          action={
            <Button variant="secondary" onClick={() => setSearchTerm("")}>
              Clear
            </Button>
          }
        />
      ) : (
        <Table columns={COLUMNS} rows={rows} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <Card>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </Card>
  );
}