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
import useProcurement from "@/hooks/useProcurement";
import { procurementApi } from "@/services/api/procurement";
import { formatCurrency } from "@/lib/formatters";
import DetailDialog from "@/components/common/DetailDialog";

const COLS = [
  { key: "item_name", label: "Item" },
  { key: "quantity", label: "Qty" },
  { key: "total_cost", label: "Total Cost" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

export default function ProcurementPage() {
  useAuthGuard();
  const { items, loading, error, fetchAll } = useProcurement();
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState(null);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Delete this record?")) return;
    try { await procurementApi.remove(id); await fetchAll(); } catch (e) { alert(e.message || "Failed"); }
  }

  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return !kw ? items : items.filter(i => [i.item_name, i.selected_supplier_name].join(" ").toLowerCase().includes(kw));
  }, [items, search]);

  const rows = filtered.map(item => ({
    ...item,
    total_cost: formatCurrency(item.total_cost),
    status: <StatusBadge status={item.status} />,
    actions: (
      <div className="flex gap-2">
        <Button variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setViewItem(item)}>View</Button>
        <Link href={`/dashboard/procurement/${item.id}/edit`}><Button variant="secondary" size="sm">Edit</Button></Link>
        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Delete</Button>
      </div>
    ),
  }));

  return (
    <div className="page-container">
      <PageHeader title="Procurement" description="Manage procurement decisions."
        action={<Link href="/dashboard/procurement/create"><Button>+ New Decision</Button></Link>} />
      <Card className="mb-4">
        <input type="text" placeholder="Search by item or supplier..." value={search} onChange={e => setSearch(e.target.value)} className="input-field" />
      </Card>
      {loading ? <LoadingSpinner label="Loading procurement..." /> :
       error ? <Card><p className="text-sm text-red-600">{error}</p></Card> :
       items.length === 0 ? <EmptyState icon="🛒" title="No procurement records" description="Create your first decision." action={<Link href="/dashboard/procurement/create"><Button>New Decision</Button></Link>} /> :
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