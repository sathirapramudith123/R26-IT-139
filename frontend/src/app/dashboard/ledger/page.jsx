"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useLedger from "@/hooks/useLedger";
import { ledgerApi } from "@/services/api/ledger.api";

const COLUMNS = [
  { key: "title", label: "Title" },
  { key: "amount", label: "Amount" },
  { key: "entry_type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "payment_method", label: "Payment" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Date" },
  { key: "actions", label: "Actions" },
];

export default function LedgerPage() {
  const {
    items,
    summary,
    monthlyReport,
    paymentSplit,
    loading,
    error,
    fetchAll,
  } = useLedger();

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this ledger entry?")) return;

    try {
      await ledgerApi.delete(id);
      await fetchAll();
    } catch (err) {
      alert(err.message || "Failed to delete ledger entry");
    }
  }

  function downloadCsv() {
    window.open("http://localhost:8000/api/v1/ledger/export/csv", "_blank");
  }

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.title?.toLowerCase().includes(keyword) ||
        item.entry_type?.toLowerCase().includes(keyword) ||
        item.category?.toLowerCase().includes(keyword) ||
        item.payment_method?.toLowerCase().includes(keyword) ||
        item.status?.toLowerCase().includes(keyword) ||
        item.id?.toLowerCase().includes(keyword) ||
        String(item.amount ?? "").includes(keyword);

      const matchesType =
        typeFilter === "all" || item.entry_type === typeFilter;

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const matchesPayment =
        paymentFilter === "all" || item.payment_method === paymentFilter;

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesPayment &&
        matchesStatus
      );
    });
  }, [items, searchTerm, typeFilter, categoryFilter, paymentFilter, statusFilter]);

  const rows = filteredItems.map((item) => ({
    ...item,
    amount: `LKR ${Number(item.amount || 0).toLocaleString()}`,
    entry_type: String(item.entry_type || "—").replaceAll("_", " "),
    category: String(item.category || "—").replaceAll("_", " "),
    payment_method: String(item.payment_method || "—").replaceAll("_", " "),
    status: <StatusBadge status={item.status} />,
    created_at: item.created_at
      ? new Date(item.created_at).toLocaleDateString("en-LK")
      : "—",
    actions: (
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/dashboard/ledger/${item.id}`}>
          <Button variant="ghost" size="sm">
            View
          </Button>
        </Link>

        <Link href={`/dashboard/ledger/${item.id}/edit`}>
          <Button variant="primary" size="sm">
            Edit
          </Button>
        </Link>

        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
          Delete
        </Button>
      </div>
    ),
  }));

  return (
    <div className="page-container">
      <PageHeader
        title="Digital Financial Ledger"
        description="Structured financial visibility for rural micro-merchants."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={downloadCsv}>
              Export CSV
            </Button>
            <Link href="/dashboard/ledger/create">
              <Button>+ New Entry</Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <Card>
            <p className="text-sm text-slate-500">Total Income</p>
            <h3 className="mt-2 text-2xl font-bold text-green-600">
              LKR {Number(summary.total_income || 0).toLocaleString()}
            </h3>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Total Expense</p>
            <h3 className="mt-2 text-2xl font-bold text-red-600">
              LKR {Number(summary.total_expense || 0).toLocaleString()}
            </h3>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Net Profit</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900">
              LKR {Number(summary.net_profit || 0).toLocaleString()}
            </h3>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Cash Balance</p>
            <h3 className="mt-2 text-2xl font-bold text-blue-600">
              LKR {Number(summary.cash_balance || 0).toLocaleString()}
            </h3>
          </Card>
        </div>
      )}

      {paymentSplit && (
        <Card className="mb-5">
          <h2 className="mb-3 font-outfit text-lg font-bold text-slate-900">
            Cash vs Digital Split
          </h2>

          <div className="grid gap-3 md:grid-cols-4">
            {Object.entries(paymentSplit).map(([method, amount]) => (
              <div key={method} className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {method.replaceAll("_", " ")}
                </p>
                <p className="mt-1 font-bold text-slate-900">
                  LKR {Number(amount || 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-5">
        <h2 className="mb-3 font-outfit text-lg font-bold text-slate-900">
          Monthly Statement
        </h2>

        {Object.entries(monthlyReport || {}).length === 0 ? (
          <p className="text-sm text-slate-500">No monthly statement data yet.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(monthlyReport).map(([month, value]) => (
              <div key={month} className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-800">{month}</p>
                <p className="mt-1 text-slate-600">
                  Income: LKR {Number(value.monthly_income || 0).toLocaleString()} |
                  Expense: LKR {Number(value.monthly_expense || 0).toLocaleString()} |
                  Profit: LKR {Number(value.monthly_profit || 0).toLocaleString()} |
                  Transactions: {value.transaction_count}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            type="text"
            placeholder="Search title, amount, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 md:col-span-2"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="sales">Sales</option>
            <option value="supplier_payment">Supplier Payment</option>
            <option value="expense">Expense</option>
            <option value="agency_banking">Agency Banking</option>
            <option value="cash_deposit">Cash Deposit</option>
            <option value="qr_payment">QR Payment</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="qr_payment">QR Payment</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_payment">Mobile Payment</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {(searchTerm ||
          typeFilter !== "all" ||
          categoryFilter !== "all" ||
          paymentFilter !== "all" ||
          statusFilter !== "all") && (
          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("all");
                setCategoryFilter("all");
                setPaymentFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </Card>

      {loading ? (
        <LoadingSpinner label="Loading ledger..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon="📒"
          title="No ledger entries"
          description="Create a transaction or ledger entry to start financial tracking."
          action={
            <Link href="/dashboard/ledger/create">
              <Button>New Entry</Button>
            </Link>
          }
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No matching ledger entries"
          description="Try changing your search text or filters."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("all");
                setCategoryFilter("all");
                setPaymentFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : (
        <Table columns={COLUMNS} rows={rows} />
      )}
    </div>
  );
}