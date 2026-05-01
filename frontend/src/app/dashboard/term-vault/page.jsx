"use client";
import { useEffect } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useTermVault from "@/hooks/useTermVault";

const COLUMNS = [
  { key: "name",         label: "Vault Name" },
  { key: "member_count", label: "Members" },
  { key: "status",       label: "Status" },
  { key: "actions",      label: "" }
];

export default function TermVaultPage() {
  const { items, loading, fetchAll } = useTermVault();
  useEffect(() => { fetchAll(); }, []);

  const rows = items.map((item) => ({
    ...item,
    status: <StatusBadge status={item.status} />,
    actions: <Link href={`/dashboard/term-vault/${item.id}`}><Button variant="ghost" size="sm">View →</Button></Link>
  }));

  return (
    <div className="page-container">
      <PageHeader title="Term Vault" description="Run group savings and collaborative vaults."
        action={<Link href="/dashboard/term-vault/create"><Button>+ New Vault</Button></Link>} />
      {loading ? <LoadingSpinner label="Loading vaults…" /> : items.length === 0 ?
        <EmptyState icon="🔐" title="No term vaults" description="Create a collaborative savings vault."
          action={<Link href="/dashboard/term-vault/create"><Button>New Vault</Button></Link>} /> :
        <Table columns={COLUMNS} rows={rows} />}
    </div>
  );
}
