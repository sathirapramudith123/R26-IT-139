"use client";

import { useEffect } from "react";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useProcurement from "@/hooks/useProcurement";

const COLUMNS = [
  { key: "item_name", label: "Item" },
  { key: "quantity", label: "Qty" },
  { key: "delivery_location", label: "Location" },
  { key: "selected_supplier_name", label: "Supplier" },
  { key: "total_cost", label: "Total Cost" },
  { key: "estimated_profit", label: "Profit" },
  { key: "final_score", label: "Score" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

function money(value) {
  return `LKR ${Number(value || 0).toLocaleString()}`;
}

export default function ProcurementPage() {
  const { items, loading, fetchAll } = useProcurement();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const rows = items.map((item) => ({
    ...item,
    total_cost: money(item.total_cost),
    estimated_profit: money(item.estimated_profit),
    final_score: `${item.final_score || 0}/100`,
    status: <StatusBadge status={item.status} />,
    actions: (
      <Link href={`/dashboard/procurement/${item.id}`}>
        <Button variant="ghost" size="sm">
          View
        </Button>
      </Link>
    ),
  }));

  return (
    <div className="page-container">
      <PageHeader
        title="Smart Procurement"
        description="Saved supplier decisions and procurement recommendations."
        action={
          <Link href="/dashboard/procurement/create">
            <Button>+ New Decision</Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading procurement decisions..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="No procurement decisions"
          description="Create a rule-based smart procurement decision."
          action={
            <Link href="/dashboard/procurement/create">
              <Button>New Decision</Button>
            </Link>
          }
        />
      ) : (
        <Table columns={COLUMNS} rows={rows} />
      )}
    </div>
  );
}