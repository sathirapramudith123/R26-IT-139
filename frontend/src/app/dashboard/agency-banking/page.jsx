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
import DetailDialog from "@/components/common/DetailDialog";
import { Plus, Search, Eye, Edit3, Trash2, Landmark, CreditCard, Coins, Receipt } from "lucide-react";

const COLS = [
  { key: "customer_name", label: "Customer" },
  { key: "transaction_type", label: "Type" },
  { key: "amount", label: "Amount" },
  { key: "commission", label: "Commission" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

export default function AgencyBankingPage() {
  useAuthGuard();
  const { items, summary, loading, error, fetchAll } = useAgencyBanking();
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await agencyBankingApi.remove(id);
      await fetchAll();
    } catch (e) {
      alert(e.message || "Failed to delete transaction.");
    }
  }

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return !kw
      ? items
      : items.filter(i =>
          [i.customer_name, i.customer_phone, i.transaction_type]
            .join(" ")
            .toLowerCase()
            .includes(kw)
        );
  }, [items, search]);

  const rows = filtered.map(item => ({
    ...item,
    customer_name: (
      <div>
        <p className="font-medium text-slate-200">{item.customer_name}</p>
        <p className="text-xs text-slate-500">{item.customer_phone}</p>
      </div>
    ),
    transaction_type: (
      <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
        {titleCase(item.transaction_type || "")}
      </span>
    ),
    amount: <span className="font-semibold text-slate-100">{formatCurrency(item.amount)}</span>,
    commission: <span className="font-medium text-emerald-400">{formatCurrency(item.commission)}</span>,
    status: <StatusBadge status={item.status} />,
    actions: (
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg"
          onClick={() => setViewItem(item)}
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Link href={`/dashboard/agency-banking/edit/${item.id}`}>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg"
            title="Edit"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg"
          onClick={() => handleDelete(item.id)}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  }));

  const summaryCards = [
    { label: "Transactions", val: summary?.total_transactions ?? 0, icon: Receipt, color: "text-slate-100" },
    { label: "Volume", val: formatCurrency(summary?.total_amount), icon: Landmark, color: "text-teal-400" },
    { label: "Service Fees", val: formatCurrency(summary?.total_service_fees), icon: CreditCard, color: "text-sky-400" },
    { label: "Commission", val: formatCurrency(summary?.total_commission), icon: Coins, color: "text-emerald-400" },
  ];

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8">
      {/* Header */}
      <PageHeader
        title="Agency Banking"
        description="Manage customer banking transactions and agent commissions."
        action={
          <Link href="/dashboard/agency-banking/create">
            <Button className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold px-4 py-2.5 shadow-lg shadow-teal-600/20 transition-all">
              <Plus className="h-4 w-4" />
              New Transaction
            </Button>
          </Link>
        }
      />

      {/* Summary Metrics */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {summaryCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Card
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-400">{card.label}</p>
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>
                <p className={`mt-2 text-2xl font-bold tracking-tight ${card.color}`}>
                  {card.val}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by customer name, phone, or transaction type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all shadow-xl"
        />
      </div>

      {/* Main Table / Content Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner label="Loading transactions..." />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-400">{error}</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="🏦"
            title="No transactions found"
            description="Start by creating your first agency banking transaction."
            action={
              <Link href="/dashboard/agency-banking/create">
                <Button className="bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl px-4 py-2">
                  New Transaction
                </Button>
              </Link>
            }
          />
        ) : (
          <Table columns={COLS} rows={rows} />
        )}
      </div>

      {/* Detail View Modal */}
      <DetailDialog
        open={!!viewItem}
        title={viewItem?.customer_name || "Transaction Details"}
        data={viewItem}
        onClose={() => setViewItem(null)}
      />
    </div>
  );
}