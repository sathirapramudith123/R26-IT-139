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
  { key: "created_at",       label: "Date" },
  { key: "actions",          label: "" }
];

export default function TransactionsPage() {
  const { items, loading, fetchAll } = useTransactions();
  useEffect(() => { fetchAll(); }, []);

  const rows = items.map((item) => ({
    ...item,
    amount: `LKR ${Number(item.amount).toLocaleString()}`,
    status: <StatusBadge status={item.status} />,
    created_at: item.created_at ? new Date(item.created_at).toLocaleDateString("en-LK") : "—",
    actions: <Link href={`/dashboard/transactions/${item.id}`}><Button variant="ghost" size="sm">View →</Button></Link>
  }));

  return (
    <div className="page-container">
      <PageHeader title="Transactions" description="Review payment, sales, and transfer records."
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/transactions/history"><Button variant="secondary">History</Button></Link>
            <Link href="/dashboard/transactions/create"><Button>+ New</Button></Link>
          </div>
        } />
      {loading ? <LoadingSpinner label="Loading transactions…" /> : items.length === 0 ?
        <EmptyState icon="💳" title="No transactions" description="Record your first transaction."
          action={<Link href="/dashboard/transactions/create"><Button>New Transaction</Button></Link>} /> :
        <Table columns={COLUMNS} rows={rows} />}
    </div>
  );
}
