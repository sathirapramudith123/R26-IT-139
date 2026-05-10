"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { ledgerApi } from "@/services/api/ledger.api";

function Info({ label, value }) {
  return <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800 capitalize">{String(value??"—").replaceAll("_"," ")}</p></div>;
}

export default function LedgerDetailPage() {
  useAuthGuard();
  const { ledgerId } = useParams(); const router = useRouter();
  const [item,setItem]=useState(null); const [loading,setLoading]=useState(true); const [deleting,setDeleting]=useState(false);

  useEffect(()=>{
    if(!ledgerId) return;
    ledgerApi.getById(ledgerId).then(setItem).catch(()=>setItem(null)).finally(()=>setLoading(false));
  },[ledgerId]);

  async function handleDelete() {
    if(!confirm("Delete this entry?")) return;
    setDeleting(true);
    try { await ledgerApi.remove(ledgerId); router.push("/dashboard/ledger"); }
    catch(e){ alert(e.message||"Failed"); } finally { setDeleting(false); }
  }

  return (
    <div className="page-container">
      <PageHeader title="Ledger Entry Details" description="View financial entry."
        action={<Link href="/dashboard/ledger"><Button variant="secondary">← Back</Button></Link>} />
      {loading?<LoadingSpinner/>:!item?<Card><p className="text-slate-500">Entry not found.</p></Card>:(
        <Card className="w-full">
          <div className="mb-6 flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
            <div><h2 className="font-outfit text-2xl font-bold text-slate-900">{item.title}</h2><p className="mt-1 text-xs text-slate-400">ID: {item.id}</p></div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={item.status}/>
              <Link href={`/dashboard/ledger/${item.id}/edit`}><Button size="sm">Edit</Button></Link>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>{deleting?"Deleting...":"Delete"}</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Amount" value={`LKR ${Number(item.amount||0).toLocaleString()}`}/>
            <Info label="Entry Type" value={item.entry_type}/>
            <Info label="Category" value={item.category}/>
            <Info label="Payment Method" value={item.payment_method}/>
            <Info label="Status" value={item.status}/>
            <Info label="Created" value={item.created_at?new Date(item.created_at).toLocaleDateString("en-LK"):"—"}/>
          </div>
        </Card>
      )}
    </div>
  );
}