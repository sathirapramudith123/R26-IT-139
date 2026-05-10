"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useInventory from "@/hooks/useInventory";

const COLS=[{key:"name",label:"Item"},{key:"supplier_name",label:"Supplier"},{key:"quantity",label:"Current Qty"},{key:"reorder_level",label:"Reorder Level"},{key:"unit_price",label:"Unit Price"},{key:"actions",label:""}];

export default function AlertsPage() {
  useAuthGuard();
  const { items, loading, error, fetchAll } = useInventory();
  const [search,setSearch]=useState("");
  useEffect(()=>{ fetchAll(); },[fetchAll]);

  const lowStockItems = useMemo(()=>items.filter(i=>i.status==="low_stock"),[items]);
  const filtered = useMemo(()=>{
    const kw=search.trim().toLowerCase();
    return !kw?lowStockItems:lowStockItems.filter(i=>[i.name,i.supplier_name].join(" ").toLowerCase().includes(kw));
  },[lowStockItems,search]);

  const rows = filtered.map(item=>({
    ...item,
    quantity: <span className="font-semibold text-red-600">{item.quantity??0}</span>,
    unit_price: `LKR ${Number(item.unit_price??0).toLocaleString()}`,
    actions:(
      <div className="flex gap-2">
        <Link href={`/dashboard/inventory/${item.id}/edit`}><Button variant="primary" size="sm">Restock</Button></Link>
        <Link href={`/dashboard/inventory/${item.id}`}><Button variant="ghost" size="sm">View</Button></Link>
      </div>
    )
  }));

  return (
    <div className="page-container">
      <PageHeader title="Low Stock Alerts" description="Items that have reached their reorder level."
        action={<Link href="/dashboard/inventory"><Button variant="secondary">← All Inventory</Button></Link>} />
      {!loading&&lowStockItems.length>0&&(
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
          <Card><p className="text-xs font-medium text-slate-400">Low stock items</p><p className="mt-1 text-2xl font-bold text-red-600">{lowStockItems.length}</p></Card>
          <Card><p className="text-xs font-medium text-slate-400">Est. restock cost</p><p className="mt-1 text-2xl font-bold text-slate-800">LKR {Number(lowStockItems.reduce((s,i)=>s+Math.max(0,(i.reorder_level??0)-(i.quantity??0))*(i.unit_price??0),0)).toLocaleString()}</p></Card>
        </div>
      )}
      {loading?<LoadingSpinner label="Checking stock levels..."/>:
       error?<Card><p className="text-sm text-red-600">{error}</p></Card>:
       lowStockItems.length===0?<EmptyState icon="✅" title="All stock levels are healthy" description="No items have reached their reorder level." action={<Link href="/dashboard/inventory"><Button>View All Inventory</Button></Link>}/>:
       <Table columns={COLS} rows={rows}/>}
    </div>
  );
}
