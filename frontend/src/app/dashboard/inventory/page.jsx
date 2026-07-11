"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useInventory from "@/hooks/useInventory";
import { inventoryApi } from "@/services/api/inventory";
import { formatCurrency } from "@/lib/formatters";
import DetailDialog from "@/components/common/DetailDialog";

const COLS = [
  { key: "name", label: "Item" },
  { key: "supplier_name", label: "Supplier" },
  { key: "quantity", label: "Qty" },
  { key: "reorder_level", label: "Reorder" },
  { key: "unit_price", label: "Unit Price" },
  { key: "actions", label: "" },
];

export default function InventoryPage() {
  useAuthGuard();
  const { items, loading, error, fetchAll } = useInventory();
  const [viewItem, setViewItem] = useState(null);
  const [search, setSearch] = useState("");
  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleDelete(id) {
    if (!confirm("Delete this item?")) return;
    try { await inventoryApi.remove(id); await fetchAll(); } catch (e) { alert(e.message || "Failed"); }
  }

  const lowCount = items.filter(i => Number(i.quantity) <= Number(i.reorder_level)).length;
  const filtered = useMemo(() => {
    const kw = search.toLowerCase().trim();
    return !kw ? items : items.filter(i => [i.name, i.supplier_name].join(" ").toLowerCase().includes(kw));
  }, [items, search]);

  const rows = filtered.map(item => ({
    ...item,
    supplier_name: item.supplier_name ?? "—",
    unit_price: formatCurrency(item.unit_price),
    quantity: Number(item.quantity) <= Number(item.reorder_level)
      ? <span className="font-semibold text-red-600">{item.quantity}</span> : item.quantity,
    actions: (
      <div className="flex gap-2">
        <Button variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setViewItem(item)}>View</Button>
        <Link href={`/dashboard/inventory/${item.id}/edit`}><Button variant="secondary" size="sm">Edit</Button></Link>
        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Delete</Button>
      </div>
    ),
  }));

  return (
    <div className="page-container">
      <PageHeader title="Inventory" description="Track stock levels and items."
        action={<Link href="/dashboard/inventory/create"><Button>+ Add Item</Button></Link>} />
      {lowCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>⚠ {lowCount} item{lowCount > 1 ? "s" : ""} running low.</span>
          <Link href="/dashboard/inventory/alerts"><Button variant="secondary" size="sm">View Alerts</Button></Link>
        </div>
      )}
      <Card className="mb-4">
        <input type="text" placeholder="Search by name or supplier..." value={search} onChange={e => setSearch(e.target.value)} className="input-field" />
      </Card>
      {loading ? <LoadingSpinner label="Loading inventory..." /> :
       error ? <Card><p className="text-sm text-red-600">{error}</p></Card> :
       items.length === 0 ? <EmptyState icon="📦" title="No inventory items" description="Add your first stock item." action={<Link href="/dashboard/inventory/create"><Button>Add Item</Button></Link>} /> :
       <Table columns={COLS} rows={rows} />}

      <DetailDialog
        open={!!viewItem}
        title={viewItem?.name || "Inventory Item"}
        data={viewItem}
        onClose={() => setViewItem(null)}
      />
    </div>
  );
}