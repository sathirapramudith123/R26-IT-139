"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useAgencyBanking from "@/hooks/useAgencyBanking";
import { agencyBankingApi } from "@/services/api/agencyBanking";
import { formatCurrency, titleCase } from "@/lib/formatters";

const COLS = [
  { key: "customer_name", label: "Customer" }, { key: "transaction_type", label: "Type" },
  { key: "amount", label: "Amount" }, { key: "commission", label: "Commission" },
  { key: "status", label: "Status" }, { key: "actions", label: "" },
];

export default function AgencyBankingPage() {
  useAuthGuard();
  const { items, summary, loading, error, fetchAll } = useAgencyBanking();
  const [search, setSearch] = useState("");
  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Delete this transaction?")) return;
    try { await agencyBankingApi.remove(id); await fetchAll(); } catch (e) { alert(e.message || "Failed"); }
  }

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return !kw ? items : items.filter(i => [i.customer_name, i.customer_phone, i.transaction_type].join(" ").toLowerCase().includes(kw));
  }, [items, search]);

  const rows = filtered.map(item => ({
    ...item,
    transaction_type: titleCase(item.transaction_type || ""),
    amount: formatCurrency(item.amount),
    commission: formatCurrency(item.commission),
    status: <StatusBadge status={item.status} />,
    actions: (
      <div className="flex gap-2">
        <Link href={`/dashboard/agency-banking/${item.id}/edit`}><Button variant="secondary" size="sm">Edit</Button></Link>
        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Delete</Button>
      </div>
    ),
  }));

  return (
    <div className="page-container">
      <PageHeader title="Agency Banking" description="Customer banking transactions and commission."
        action={<Link href="/dashboard/agency-banking/create"><Button>+ New Transaction</Button></Link>} />
      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Transactions", summary.total_transactions, "text-slate-800"],
            ["Volume", formatCurrency(summary.total_amount), "text-slate-800"],
            ["Service Fees", formatCurrency(summary.total_service_fees), "text-blue-600"],
            ["Commission", formatCurrency(summary.total_commission), "text-emerald-600"],
          ].map(([l, v, c]) => (
            <Card key={l}><p className="text-xs font-medium text-slate-400">{l}</p><p className={`mt-1 text-xl font-bold ${c}`}>{v}</p></Card>
          ))}
        </div>
      )}
      <Card className="mb-4">
        <input type="text" placeholder="Search by customer, phone, type..." value={search} onChange={e => setSearch(e.target.value)} className="input-field" />
      </Card>
      {loading ? <LoadingSpinner label="Loading transactions..." /> :
       error ? <Card><p className="text-sm text-red-600">{error}</p></Card> :
       items.length === 0 ? <EmptyState icon="🏦" title="No transactions" description="Record a banking transaction." action={<Link href="/dashboard/agency-banking/create"><Button>New Transaction</Button></Link>} /> :
       <Table columns={COLS} rows={rows} />}
    </div>
  );
}