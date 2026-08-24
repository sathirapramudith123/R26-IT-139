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
import useSuppliers from "@/hooks/useSuppliers";
import { supplierApi } from "@/services/api/supplier";
import { formatCurrency } from "@/lib/formatters";
import DetailDialog from "@/components/common/DetailDialog";

const COLS = [
  { key: "name", label: "Supplier" }, 
  { key: "company_name", label: "Company" },
  { key: "contact_number", label: "Contact" }, 
  { key: "unit_price", label: "Unit Price" },
  { key: "status", label: "Status" }, 
  { key: "actions", label: "" },
];

export default function SuppliersPage() {
  useAuthGuard();
  const { items, loading, error, fetchAll } = useSuppliers();
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState(null);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Delete this supplier?")) return;
    try { await supplierApi.remove(id); await fetchAll(); } catch (e) { alert(e.message || "Failed"); }
  }

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return !kw ? items : items.filter(i => [i.name, i.company_name, i.contact_number].join(" ").toLowerCase().includes(kw));
  }, [items, search]);

  const rows = filtered.map(item => ({
    ...item,
    company_name: item.company_name ?? "—",
    unit_price: formatCurrency(item.unit_price),
    status: <StatusBadge status={item.status} />,
    actions: (
      <div className="flex gap-2">
        <Button variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setViewItem(item)}>View</Button>
        <Link href={`/dashboard/suppliers/${item.id}/edit`}><Button variant="secondary" size="sm">Edit</Button></Link>
        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Delete</Button>
      </div>
    ),
  }));

  return (
    <div className="page-container">
      <PageHeader title="Suppliers" description="Manage supplier details."
        action={<Link href="/dashboard/suppliers/create"><Button>+ Add Supplier</Button></Link>} />
      <Card className="mb-4">
        <input type="text" placeholder="Search by name, company, contact..." value={search} onChange={e => setSearch(e.target.value)} className="input-field" />
      </Card>
      {loading ? <LoadingSpinner label="Loading suppliers..." /> :
       error ? <Card><p className="text-sm text-red-600">{error}</p></Card> :
       items.length === 0 ? <EmptyState icon="🤝" title="No suppliers" description="Add your first supplier." action={<Link href="/dashboard/suppliers/create"><Button>Add Supplier</Button></Link>} /> :
       <Table columns={COLS} rows={rows} />}
       <DetailDialog
               open={!!viewItem}
               title={viewItem?.name || "Procument"}
               data={viewItem}
               onClose={() => setViewItem(null)}
      />
    </div>
  );
}