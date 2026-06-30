"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import { inventoryApi } from "@/services/api/inventory";
import { formatCurrency } from "@/lib/formatters";

const COLS = [
  { key: "name", label: "Item" }, { key: "quantity", label: "Current Qty" },
  { key: "reorder_level", label: "Reorder Level" }, { key: "unit_price", label: "Unit Price" },
  { key: "actions", label: "" },
];

export default function AlertsPage() {
  useAuthGuard();
  const [data, setData] = useState({ running_out: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    inventoryApi.status().then(setData).catch(e => setError(e.message || "Failed")).finally(() => setLoading(false));
  }, []);

  const rows = (data.running_out || []).map(item => ({
    ...item,
    quantity: <span className="font-semibold text-red-600">{item.quantity}</span>,
    unit_price: formatCurrency(item.unit_price),
    actions: <Link href={`/dashboard/inventory/${item.id}/edit`}><Button variant="primary" size="sm">Restock</Button></Link>,
  }));

  return (
    <div className="page-container">
      <PageHeader title="Low Stock Alerts" description="Items at or below their reorder level."
        action={<Link href="/dashboard/inventory"><Button variant="secondary">← All Inventory</Button></Link>} />
      {data.summary && (
        <Card><p className="text-xs text-slate-400">Running out</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{data.summary.running_out}</p></Card>
      )}
      {loading ? <LoadingSpinner label="Checking stock..." /> :
       error ? <Card><p className="text-sm text-red-600">{error}</p></Card> :
       (data.running_out || []).length === 0 ? <EmptyState icon="✅" title="All stock healthy" description="No items have reached their reorder level." /> :
       <Table columns={COLS} rows={rows} />}
    </div>
  );
}