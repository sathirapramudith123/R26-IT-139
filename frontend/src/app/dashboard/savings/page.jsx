"use client";
import { useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useSavings from "@/hooks/useSavings";

const COLUMNS = [
  { key: "target_name", label: "Goal Name" },
  { key: "balance",     label: "Balance (LKR)" },
  { key: "status",      label: "Status" },
  { key: "actions",     label: "" }
];

export default function SavingsPage() {
  const { items, loading, fetchAll } = useSavings();
  useEffect(() => { fetchAll(); }, []);

  const rows = items.map((item) => ({
    ...item,
    balance: `LKR ${Number(item.balance).toLocaleString()}`,
    status: <StatusBadge status={item.status} />,
    actions: <Link href={`/dashboard/savings/${item.id}`}><Button variant="ghost" size="sm">View →</Button></Link>
  }));

  return (
    <div className="page-container">
      <PageHeader title="Savings" description="Monitor savings goals and merchant balances."
        action={<Link href="/dashboard/savings/create"><Button>+ New Goal</Button></Link>} />
      {loading ? <LoadingSpinner label="Loading savings…" /> : items.length === 0 ?
        <EmptyState icon="🏦" title="No savings goals" description="Start your first savings goal today."
          action={<Link href="/dashboard/savings/create"><Button>New Goal</Button></Link>} /> :
        <Table columns={COLUMNS} rows={rows} />}
    </div>
  );
}
