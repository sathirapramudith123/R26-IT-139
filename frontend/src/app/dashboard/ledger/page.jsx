"use client";
import { useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useLedger from "@/hooks/useLedger";

const COLUMNS = [
  { key: "title",      label: "Title" },
  { key: "amount",     label: "Amount (LKR)" },
  { key: "entry_type", label: "Type" },
  { key: "status",     label: "Status" },
  { key: "actions",    label: "" }
];

export default function LedgerPage() {
  const { items, loading, fetchAll } = useLedger();
  useEffect(() => { fetchAll(); }, []);

  const rows = items.map((item) => ({
    ...item,
    amount: `LKR ${Number(item.amount).toLocaleString()}`,
    status: <StatusBadge status={item.status} />,
    actions: <Link href={`/dashboard/ledger/${item.id}`}><Button variant="ghost" size="sm">View →</Button></Link>
  }));

  return (
    <div className="page-container">
      <PageHeader title="Ledger" description="Track financial entries and merchant activity."
        action={<Link href="/dashboard/ledger/create"><Button>+ New Entry</Button></Link>} />
      {loading ? <LoadingSpinner label="Loading ledger…" /> : items.length === 0 ?
        <EmptyState icon="📒" title="No ledger entries" description="Record your first financial entry."
          action={<Link href="/dashboard/ledger/create"><Button>New Entry</Button></Link>} /> :
        <Table columns={COLUMNS} rows={rows} />}
    </div>
  );
}
