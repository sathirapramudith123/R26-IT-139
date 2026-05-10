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
import { transactionApi } from "@/services/api/transaction.api";

function Info({ label, value, color="" }) {
  return <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-medium text-slate-400">{label}</p><p className={`mt-0.5 text-sm font-semibold capitalize ${color||"text-slate-800"}`}>{String(value??"—").replaceAll("_"," ")}</p></div>;
}

export default function TransactionDetailPage() {
  useAuthGuard();
  const { transactionId } = useParams(); const router = useRouter();
  const [item,setItem]=useState(null); const [loading,setLoading]=useState(true); const [deleting,setDeleting]=useState(false);

  useEffect(()=>{
    if(!transactionId) return;
    transactionApi.getById(transactionId).then(setItem).catch(()=>setItem(null)).finally(()=>setLoading(false));
  },[transactionId]);

  async function handleDelete() {
    if(!confirm("Delete this transaction?")) return;
    setDeleting(true);
    try { await transactionApi.remove(transactionId); router.push("/dashboard/transactions"); }
    catch(e){ alert(e.message||"Failed"); } finally { setDeleting(false); }
  }

  const isIncome = t=>["sale","deposit"].includes(t);

  return (
    <div className="page-container">
      <PageHeader title="Transaction Details" description="Detailed financial record."
        action={<Link href="/dashboard/transactions"><Button variant="secondary">← Back</Button></Link>} />
      {loading?<LoadingSpinner/>:!item?<Card><p className="text-slate-500">Transaction not found.</p></Card>:(
        <Card className="w-full">
          <div className="mb-6 flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
            <div><h2 className="font-outfit text-2xl font-bold text-slate-900 capitalize">{item.transaction_type?.replaceAll("_"," ")}</h2><p className="mt-1 text-xs text-slate-400">ID: {item.id}</p></div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={item.status}/>
              <Link href={`/dashboard/transactions/${item.id}/edit`}><Button size="sm">Edit</Button></Link>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>{deleting?"Deleting...":"Delete"}</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Amount" value={`LKR ${Number(item.amount||0).toLocaleString()}`} color={isIncome(item.transaction_type)?"text-green-600":"text-red-500"}/>
            <Info label="Type" value={item.transaction_type}/>
            <Info label="Payment Method" value={item.payment_method}/>
            <Info label="Category" value={item.category}/>
            <Info label="Description" value={item.description}/>
            <Info label="Status" value={item.status}/>
            <Info label="Date" value={item.date?new Date(item.date).toLocaleDateString("en-LK"):"—"}/>
            <Info label="Created" value={item.created_at?new Date(item.created_at).toLocaleString("en-LK"):"—"}/>
          </div>
        </Card>
      )}
    </div>
  );
}