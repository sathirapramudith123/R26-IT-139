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
import useTransactions from "@/hooks/useTransactions";
import { transactionApi } from "@/services/api/transaction.api";

const COLS=[{key:"transaction_type",label:"Type"},{key:"category",label:"Category"},{key:"amount",label:"Amount"},{key:"payment_method",label:"Payment"},{key:"status",label:"Status"},{key:"created_at",label:"Date"},{key:"actions",label:""}];

export default function TransactionsPage() {
  useAuthGuard();
  const { items, loading, error, fetchAll } = useTransactions();
  const [search,setSearch]=useState("");
  useEffect(()=>{ fetchAll(); },[fetchAll]);

  async function handleDelete(id) {
    if(!confirm("Delete this transaction?")) return;
    try { await transactionApi.remove(id); await fetchAll(); }
    catch(e){ alert(e.message||"Failed"); }
  }

  const filtered = useMemo(()=>{
    const kw=search.toLowerCase().trim();
    return !kw?items:items.filter(i=>[i.transaction_type,i.category,i.payment_method,i.status,i.description].join(" ").toLowerCase().includes(kw));
  },[items,search]);

  const rows = filtered.map(item=>({
    ...item,
    transaction_type: item.transaction_type?.replaceAll("_"," ")||"—",
    category: item.category?.replaceAll("_"," ")||"—",
    payment_method: item.payment_method?.replaceAll("_"," ")||"—",
    amount: `LKR ${Number(item.amount||0).toLocaleString()}`,
    status: <StatusBadge status={item.status}/>,
    created_at: item.created_at?new Date(item.created_at).toLocaleDateString("en-LK"):"—",
    actions:(
      <div className="flex gap-2">
        <Link href={`/dashboard/transactions/${item.id}`}><Button variant="ghost" size="sm">View</Button></Link>
        <Link href={`/dashboard/transactions/${item.id}/edit`}><Button variant="secondary" size="sm">Edit</Button></Link>
        <Button variant="danger" size="sm" onClick={()=>handleDelete(item.id)}>Delete</Button>
      </div>
    )
  }));

  return (
    <div className="page-container">
      <PageHeader title="Transactions" description="All financial transactions."
        action={<Link href="/dashboard/transactions/create"><Button>+ New Transaction</Button></Link>} />
      <Card className="mb-4">
        <input type="text" placeholder="Search by type, category, payment, status..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none" />
      </Card>
      {loading?<LoadingSpinner label="Loading transactions..."/>:
       error?<Card><p className="text-sm text-red-600">{error}</p></Card>:
       items.length===0?<EmptyState icon="💳" title="No transactions" description="Add your first transaction." action={<Link href="/dashboard/transactions/create"><Button>New Transaction</Button></Link>}/>:
       <Table columns={COLS} rows={rows}/>}
    </div>
  );
}
