"use client";
import { useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useTransactions from "@/hooks/useTransactions";

const COLUMNS = [
  { key: "transaction_type", label: "Type" },
  { key: "amount",           label: "Amount (LKR)" },
  { key: "status",           label: "Status" },
  { key: "created_at",       label: "Date" }
];

export default function TransactionHistoryPage() {
  const { items, loading, fetchAll } = useTransactions();
  useEffect(() => { fetchAll(); }, []);

  const rows = items.map((item) => ({
    ...item,
    amount: `LKR ${Number(item.amount).toLocaleString()}`,
    status: <StatusBadge status={item.status} />,
    created_at: item.created_at ? new Date(item.created_at).toLocaleDateString("en-LK") : "—"
  }));

  return (
    <div className="page-container">
      <PageHeader title="Transaction History" description="Full historical record of all financial transactions."
        action={<Link href="/dashboard/transactions"><Button variant="secondary">← Back</Button></Link>} />
      {loading ? <LoadingSpinner label="Loading history…" /> : items.length === 0 ?
        <EmptyState icon="📋" title="No history yet" description="Completed transactions will appear here." /> :
        <Table columns={COLUMNS} rows={rows} />}
    </div>
  );
}
