"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useInventory from "@/hooks/useInventory";
import { inventoryApi } from "@/services/api/inventory.api";

const COLS = [
  { key:"name",label:"Item Name" },{ key:"supplier_name",label:"Supplier" },
  { key:"quantity",label:"Quantity" },{ key:"unit",label:"Unit" },
  { key:"unit_price",label:"Unit Price (LKR)" },{ key:"status",label:"Status" },{ key:"actions",label:"" }
];

export default function InventoryPage() {
  useAuthGuard();
  const { items, loading, error, isOffline, fetchAll } = useInventory();
  const [search,setSearch]=useState(""); const [statusFilter,setStatusFilter]=useState("all"); const [deletingId,setDeletingId]=useState(null);
  useEffect(()=>{ fetchAll(); },[fetchAll]);

  async function handleDelete(id) {
    if(!confirm("Delete this item?")) return;
    try { setDeletingId(id); await inventoryApi.remove(id); await fetchAll(); }
    catch(e){ alert(e.message||"Failed"); } finally { setDeletingId(null); }
  }

  const filtered = useMemo(()=>{
    const kw=search.trim().toLowerCase();
    return items.filter(i=>{
      const ms=!kw||[i.name,i.supplier_name,i.unit,String(i.quantity??""),String(i.unit_price??"")].join(" ").toLowerCase().includes(kw);
      const mf=statusFilter==="all"||i.status?.toLowerCase()===statusFilter;
      return ms&&mf;
    });
  },[items,search,statusFilter]);

  const lowStockCount = items.filter(i=>i.status==="low_stock").length;

  const rows = filtered.map(item=>({
    ...item,
    supplier_name: item.supplier_name??"Unknown",
    unit: item.unit??"unit",
    status: <StatusBadge status={item.status} />,
    unit_price: item.unit_price!=null?`LKR ${Number(item.unit_price).toLocaleString()}`:"—",
    actions:(
      <div className="flex gap-2">
        <Link href={`/dashboard/inventory/${item.id}`}><Button variant="ghost" size="sm">View</Button></Link>
        <Link href={`/dashboard/inventory/${item.id}/edit`}><Button variant="primary" size="sm">Edit</Button></Link>
        <Button variant="danger" size="sm" onClick={()=>handleDelete(item.id)} disabled={deletingId===item.id}>
          {deletingId===item.id?"Deleting...":"Delete"}
        </Button>
      </div>
    )
  }));

  return (
    <div className="page-container">
      <PageHeader title="Inventory" description="Track stock levels and item details."
        action={<Link href="/dashboard/inventory/create"><Button>+ Add Item</Button></Link>} />
      {isOffline && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">📶 Offline — showing cached data. <button onClick={fetchAll} className="ml-2 underline">Retry</button></div>}
      {lowStockCount>0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>⚠ {lowStockCount} item{lowStockCount>1?"s are":" is"} low on stock.</span>
          <Link href="/dashboard/inventory/alerts"><Button variant="secondary" size="sm">View Alerts</Button></Link>
        </div>
      )}
      <Card className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input type="text" placeholder="Search by name, supplier, unit..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full lg:max-w-md rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none" />
          <div className="flex gap-3">
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="select-field w-auto">
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="low_stock">Low Stock</option>
            </select>
            {(search||statusFilter!=="all") && <Button variant="secondary" onClick={()=>{setSearch("");setStatusFilter("all");}}>Clear</Button>}
          </div>
        </div>
      </Card>
      {loading ? <LoadingSpinner label="Loading inventory..." /> :
       error ? <Card><p className="text-sm text-red-600">{error}</p></Card> :
       items.length===0 ? <EmptyState icon="📦" title="No inventory items" description="Start by adding your first stock item." action={<Link href="/dashboard/inventory/create"><Button>Add Item</Button></Link>} /> :
       filtered.length===0 ? <EmptyState icon="🔍" title="No matching items" description="Try different search or filter." action={<Button variant="secondary" onClick={()=>{setSearch("");setStatusFilter("all");}}>Clear</Button>} /> :
       <Table columns={COLS} rows={rows} />}
    </div>
  );
}
