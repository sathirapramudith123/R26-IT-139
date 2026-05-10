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
import useAuthGuard from "@/hooks/useAuthGuard";
import useTransactions from "@/hooks/useTransactions";
import { formatCurrency, formatDate, titleCase } from "@/lib/formatters/index";

const COLS = [
  { key: "transaction_type", label: "Type"    },
  { key: "description",      label: "Details" },
  { key: "amount",           label: "Amount"  },
  { key: "payment_method",   label: "Payment" },
  { key: "status",           label: "Status"  },
  { key: "created_at",       label: "Date"    },
  { key: "actions",          label: ""        },
];

const TYPE_FILTERS = ["all", "sale", "purchase", "expense", "deposit", "transfer"];

export default function TransactionHistoryPage() {
  useAuthGuard();
  const { items, loading, error, fetchAll } = useTransactions();
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return items.filter(i => {
      const matchSearch = !kw ||
        [i.transaction_type, i.description, i.category, i.payment_method, i.status]
          .join(" ").toLowerCase().includes(kw);
      const matchType = typeFilter === "all" || i.transaction_type === typeFilter;
      const matchFrom = !dateFrom || new Date(i.created_at) >= new Date(dateFrom);
      const matchTo   = !dateTo   || new Date(i.created_at) <= new Date(dateTo + "T23:59:59");
      return matchSearch && matchType && matchFrom && matchTo;
    });
  }, [items, search, typeFilter, dateFrom, dateTo]);

  // Totals
  const totals = useMemo(() => ({
    income:  filtered.filter(i => ["sale","deposit"].includes(i.transaction_type)).reduce((s,i) => s + (i.amount||0), 0),
    expense: filtered.filter(i => ["purchase","expense"].includes(i.transaction_type)).reduce((s,i) => s + (i.amount||0), 0),
  }), [filtered]);

  const rows = filtered.map(item => ({
    ...item,
    transaction_type: <span className="capitalize">{item.transaction_type?.replaceAll("_"," ")}</span>,
    description:      item.description ?? "—",
    amount: (
      <span className={["sale","deposit"].includes(item.transaction_type) ? "font-semibold text-green-600" : "font-semibold text-red-500"}>
        {["sale","deposit"].includes(item.transaction_type) ? "+" : "-"}{formatCurrency(item.amount)}
      </span>
    ),
    payment_method: titleCase(item.payment_method ?? ""),
    status:         <StatusBadge status={item.status} />,
    created_at:     formatDate(item.created_at),
    actions: (
      <Link href={`/dashboard/transactions/${item.id}`}>
        <Button variant="ghost" size="sm">View</Button>
      </Link>
    ),
  }));

  function clearFilters() {
    setSearch(""); setTypeFilter("all"); setDateFrom(""); setDateTo("");
  }
  const hasFilters = search || typeFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="page-container">
      <PageHeader
        title="Transaction History"
        description="Full searchable and filterable record of all transactions."
        action={
          <Link href="/dashboard/transactions/create">
            <Button>+ New Transaction</Button>
          </Link>
        }
      />

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-2">
          {[
            ["Total Records",   filtered.length,           "text-slate-800"],
            ["Income",          formatCurrency(totals.income),  "text-emerald-600"],
            ["Expense",         formatCurrency(totals.expense), "text-red-500"],
            ["Net",             formatCurrency(totals.income - totals.expense),
              (totals.income - totals.expense) >= 0 ? "text-blue-600" : "text-red-500"],
          ].map(([l, v, c]) => (
            <Card key={l}>
              <p className="text-xs text-slate-400">{l}</p>
              <p className={`mt-1 text-lg font-bold ${c}`}>{v}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="text" placeholder="Search..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field"
          />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="select-field">
            {TYPE_FILTERS.map(t => (
              <option key={t} value={t}>{t === "all" ? "All Types" : titleCase(t)}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field" placeholder="From date" />
          <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="input-field" placeholder="To date"   />
        </div>
        {hasFilters && (
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-slate-500">{filtered.length} of {items.length} records</span>
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
          </div>
        )}
      </Card>

      {loading ? <LoadingSpinner label="Loading history..." /> :
       error   ? <Card><p className="text-sm text-red-600">{error}</p></Card> :
       items.length === 0 ? (
         <EmptyState icon="📜" title="No transactions yet"
           description="Start by recording your first transaction."
           action={<Link href="/dashboard/transactions/create"><Button>New Transaction</Button></Link>} />
       ) : filtered.length === 0 ? (
         <EmptyState icon="🔍" title="No matching transactions"
           action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />
       ) : (
         <Table columns={COLS} rows={rows} />
       )}
    </div>
  );
}
