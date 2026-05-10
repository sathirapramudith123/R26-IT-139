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
import useInventory from "@/hooks/useInventory";
import { inventoryApi } from "@/services/api/inventory.api";

const COLUMNS = [
  { key: "name", label: "Item Name" },
  { key: "supplier_name", label: "Supplier" },
  { key: "quantity", label: "Quantity" },
  { key: "unit", label: "Unit" },
  { key: "unit_price", label: "Unit Price (LKR)" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

export default function InventoryPage() {
  const { items, loading, error, fetchAll } = useInventory();
  const [searchTerm, setSearchTerm] = useState("");
  // FIXED: status values now match what the backend actually returns
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      setDeletingId(id);
      await inventoryApi.remove(id);
      await fetchAll();
    } catch (err) {
      alert(err.message || "Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.name?.toLowerCase().includes(keyword) ||
        item.supplier_name?.toLowerCase().includes(keyword) ||
        item.status?.toLowerCase().includes(keyword) ||
        item.id?.toLowerCase().includes(keyword) ||
        item.unit?.toLowerCase().includes(keyword) ||
        String(item.quantity ?? "").includes(keyword) ||
        String(item.unit_price ?? "").includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        item.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

  const lowStockCount = items.filter((i) => i.status === "low_stock").length;

  const rows = filteredItems.map((item) => ({
    ...item,
    supplier_name: item.supplier_name ?? "Unknown Supplier",
    unit: item.unit ?? "unit",
    status: <StatusBadge status={item.status} />,
    unit_price:
      item.unit_price != null
        ? `LKR ${Number(item.unit_price).toLocaleString()}`
        : "—",
    actions: (
      <div className="flex gap-2">
        <Link href={`/dashboard/inventory/${item.id}`}>
          <Button variant="ghost" size="sm">View</Button>
        </Link>
        <Link href={`/dashboard/inventory/${item.id}/edit`}>
          <Button variant="primary" size="sm">Edit</Button>
        </Link>
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleDelete(item.id)}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? "Deleting..." : "Delete"}
        </Button>
      </div>
    ),
  }));

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory"
        description="Track your stock levels and item details."
        action={
          <Link href="/dashboard/inventory/create">
            <Button>+ Add Item</Button>
          </Link>
        }
      />

      {/* Low stock banner */}
      {lowStockCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            ⚠ {lowStockCount} item{lowStockCount > 1 ? "s are" : " is"} low on
            stock.
          </span>
          <Link href="/dashboard/inventory/alerts">
            <Button variant="secondary" size="sm">
              View Alerts
            </Button>
          </Link>
        </div>
      )}

      {/* Search + Filter */}
      <Card className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-md">
            <input
              type="text"
              placeholder="Search by name, supplier, unit, quantity, price, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* FIXED: options now match backend-generated status values */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="low_stock">Low Stock</option>
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
        <LoadingSpinner label="Loading inventory..." />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No inventory items"
          description="Start by adding your first stock item."
          action={
            <Link href="/dashboard/inventory/create">
              <Button>Add Item</Button>
            </Link>
          }
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No matching inventory items"
          description="Try changing your search text or filter."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : (
        <Table columns={COLUMNS} rows={rows} />
      )}
    </div>
  );
}