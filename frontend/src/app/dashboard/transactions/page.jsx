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
import useTransactions from "@/hooks/useTransactions";
import { transactionApi } from "@/services/api/transaction";
import { formatCurrency, formatDate, titleCase } from "@/lib/formatters";
import DetailDialog from "@/components/common/DetailDialog";

// Credit = money coming in, Debit = money going out
const CREDIT_TYPES = new Set(["sale", "deposit"]);

const COLS = [
  { key: "transaction_type", label: "Type" },
  { key: "flow", label: "Credit/Debit" },
  { key: "amount", label: "Amount" },
  { key: "payment_method", label: "Payment" },
  { key: "category", label: "Category" },
  { key: "created_at", label: "Date" },
  { key: "actions", label: "" },
];

export default function TransactionsPage() {
  useAuthGuard();
  const { items, loading, error, fetchAll } = useTransactions();
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState(null);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Delete this transaction?")) return;
    try { await transactionApi.remove(id); await fetchAll(); }
    catch (e) { alert(e.message || "Failed"); }
  }

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return !kw ? items : items.filter(i =>
      [i.transaction_type, i.category, i.payment_method, i.description].join(" ").toLowerCase().includes(kw));
  }, [items, search]);

  const rows = filtered.map(item => {
    const isCredit = CREDIT_TYPES.has(item.transaction_type);
    return {
      ...item,
      transaction_type: titleCase(item.transaction_type || ""),
      flow: (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          isCredit
            ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
        }`}>
          {isCredit ? "Credit" : "Debit"}
        </span>
      ),
      amount: (
        <span className={`font-semibold ${isCredit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {isCredit ? "+" : "-"} {formatCurrency(item.amount)}
        </span>
      ),
      payment_method: titleCase(item.payment_method || ""),
      category: item.category || "—",
      created_at: formatDate(item.created_at),
      actions: (
        <div className="flex gap-2">
          <Button variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setViewItem(item)}>View</Button>
          <Link href={`/dashboard/transactions/${item.id}/edit`}><Button variant="secondary" size="sm">Edit</Button></Link>
          <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Delete</Button>
        </div>
      ),
    };
  });

  return (
    <div className="page-container">
      <PageHeader title="Transactions" description="All financial transactions."
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/reports"><Button variant="secondary">📊 Income Statement</Button></Link>
            <Link href="/dashboard/transactions/create"><Button>+ New Transaction</Button></Link>
          </div>
        } />
      <Card className="mb-4">
        <input type="text" placeholder="Search by type, category, payment..." value={search} onChange={e => setSearch(e.target.value)} className="input-field" />
      </Card>
      {loading ? <LoadingSpinner label="Loading transactions..." /> :
       error ? <Card><p className="text-sm text-red-600">{error}</p></Card> :
       items.length === 0 ? <EmptyState icon="💳" title="No transactions" description="Add your first transaction." action={<Link href="/dashboard/transactions/create"><Button>New Transaction</Button></Link>} /> :
       <Table columns={COLS} rows={rows} />}

       <DetailDialog
               open={!!viewItem}
               title={viewItem?.name || "Transaction"}
               data={viewItem}
               onClose={() => setViewItem(null)}
      />
    </div>
  );
}