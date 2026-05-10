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
import useLedger from "@/hooks/useLedger";
import { ledgerApi } from "@/services/api/ledger.api";

function money(v){ return `LKR ${Number(v||0).toLocaleString()}`; }
const LEDGER_LINKS=[
  {title:"New Transaction",href:"/dashboard/transactions/create",icon:"➕",desc:"Add income or expense"},
  {title:"Transactions",href:"/dashboard/transactions",icon:"📜",desc:"View all transactions"},
  {title:"Journal & Trial Balance",href:"/dashboard/ledger/journal",icon:"📖",desc:"Double-entry records"},
  {title:"Reports & Export",href:"/dashboard/ledger/reports",icon:"📊",desc:"Monthly breakdown"},
];
const COLS=[{key:"title",label:"Title"},{key:"amount",label:"Amount"},{key:"entry_type",label:"Type"},{key:"payment_method",label:"Payment"},{key:"status",label:"Status"},{key:"created_at",label:"Date"},{key:"actions",label:""}];

export default function LedgerPage() {
  useAuthGuard();
  const { items, summary, paymentSplit, loading, fetchAll } = useLedger();
  const [search,setSearch]=useState(""); const [deleting,setDeleting]=useState(null);
  useEffect(()=>{ fetchAll(); },[fetchAll]);

  async function handleDelete(id) {
    if(!confirm("Delete this entry?")) return;
    setDeleting(id);
    try { await ledgerApi.remove(id); await fetchAll(); }
    catch(e){ alert(e.message||"Failed"); } finally { setDeleting(null); }
  }

  const filtered = useMemo(()=>{
    const kw=search.toLowerCase().trim();
    return !kw?items:items.filter(i=>[i.title,i.entry_type,i.category,i.payment_method].join(" ").toLowerCase().includes(kw));
  },[items,search]);

  const rows = filtered.map(item=>({
    ...item,
    amount: <span className={item.entry_type==="income"?"font-semibold text-green-600":"font-semibold text-red-500"}>{money(item.amount)}</span>,
    entry_type: item.entry_type?.replaceAll("_"," ")||"—",
    payment_method: item.payment_method?.replaceAll("_"," ")||"—",
    status: <StatusBadge status={item.status}/>,
    created_at: item.created_at?new Date(item.created_at).toLocaleDateString("en-LK"):"—",
    actions:(
      <div className="flex gap-2">
        <Link href={`/dashboard/ledger/${item.id}`}><Button variant="ghost" size="sm">View</Button></Link>
        <Link href={`/dashboard/ledger/${item.id}/edit`}><Button variant="secondary" size="sm">Edit</Button></Link>
        <Button variant="danger" size="sm" onClick={()=>handleDelete(item.id)} disabled={deleting===item.id}>{deleting===item.id?"Deleting...":"Delete"}</Button>
      </div>
    )
  }));

  return (
    <div className="page-container">
      <PageHeader title="Digital Financial Ledger" description="Track all business finances with double-entry accounting."
        action={<div className="flex gap-2"><Link href="/dashboard/transactions/create"><Button>+ New Transaction</Button></Link><Link href="/dashboard/ledger/create"><Button variant="secondary">+ Manual Entry</Button></Link></div>} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-2">
        {[["Total Income",summary?.total_income,"text-green-600"],["Total Expense",summary?.total_expense,"text-red-500"],["Net Profit",summary?.net_profit,"text-slate-900"],["Cash Balance",summary?.cash_balance,"text-teal-700"]].map(([l,v,c])=>(
          <Card key={l}><p className="text-sm text-slate-500">{l}</p><h3 className={`mt-2 text-2xl font-bold ${c}`}>{money(v)}</h3></Card>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        {LEDGER_LINKS.map(lk=>(
          <Link key={lk.href} href={lk.href} className="rounded-xl border border-slate-100 bg-white p-3 transition hover:border-teal-200 hover:bg-teal-50">
            <div className="text-xl mb-1">{lk.icon}</div>
            <p className="text-xs font-semibold text-slate-800">{lk.title}</p>
            <p className="text-xs text-slate-400">{lk.desc}</p>
          </Link>
        ))}
      </div>

      {loading?<LoadingSpinner label="Loading ledger..."/>:(
        <Card>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-outfit text-lg font-bold text-slate-900">Ledger Entries <span className="text-sm font-normal text-slate-400">({filtered.length} of {items.length})</span></h2>
            <input type="text" placeholder="Search entries..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none md:w-64"/>
          </div>
          {items.length===0?<EmptyState icon="📒" title="No ledger entries" description="Create your first transaction to start tracking."/>:
           <Table columns={COLS} rows={rows}/>}
        </Card>
      )}
    </div>
  );
}
