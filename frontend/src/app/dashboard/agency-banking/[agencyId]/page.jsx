"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { ROLES } from "@/lib/constants/index";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { agencyBankingApi } from "@/services/api/agencyBanking.api";

function Info({ label, value }) {
  return <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800 capitalize">{String(value??"—").replaceAll("_"," ")}</p></div>;
}

export default function AgencyBankingDetailPage() {
  useAuthGuard(ROLES.BANK_AGENT);
  const { agencyId } = useParams(); const router = useRouter();
  const [item,setItem]=useState(null); const [loading,setLoading]=useState(true); const [deleting,setDeleting]=useState(false);

  useEffect(()=>{
    if(!agencyId) return;
    agencyBankingApi.getById(agencyId).then(setItem).catch(()=>setItem(null)).finally(()=>setLoading(false));
  },[agencyId]);

  async function handleDelete() {
    if(!confirm("Delete this transaction?")) return;
    setDeleting(true);
    try { await agencyBankingApi.remove(agencyId); router.push("/dashboard/agency-banking"); }
    catch(e){ alert(e.message||"Failed"); } finally { setDeleting(false); }
  }

  return (
    <div className="page-container">
      <PageHeader title="Agency Banking Transaction" description="View transaction, commission, and liquidity details."
        action={<Link href="/dashboard/agency-banking"><Button variant="secondary">← Back</Button></Link>} />
      {loading?<LoadingSpinner/>:!item?<Card><p className="text-slate-500">Transaction not found.</p></Card>:(
        <Card className="w-full">
          <div className="mb-6 flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
            <div><h2 className="font-outfit text-2xl font-bold text-slate-900 capitalize">{item.transaction_type?.replaceAll("_"," ")}</h2>
            <p className="mt-1 text-xs text-slate-400">Ref: {item.reference_number||"—"}</p></div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={item.status}/>
              <Link href={`/dashboard/agency-banking/${item.id}/edit`}><Button variant="primary" size="sm">Edit</Button></Link>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>{deleting?"Deleting...":"Delete"}</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Customer Name" value={item.customer_name}/>
            <Info label="Customer Phone" value={item.customer_phone}/>
            <Info label="Transaction Type" value={item.transaction_type}/>
            <Info label="Amount" value={`LKR ${Number(item.amount||0).toLocaleString()}`}/>
            <Info label="Service Fee" value={`LKR ${Number(item.service_fee||0).toLocaleString()}`}/>
            <Info label="Commission" value={`LKR ${Number(item.commission||0).toLocaleString()}`}/>
            <Info label="Agent Cash Balance" value={`LKR ${Number(item.agent_cash_balance||0).toLocaleString()}`}/>
            <Info label="Created" value={item.created_at?new Date(item.created_at).toLocaleDateString("en-LK"):"—"}/>
          </div>
        </Card>
      )}
    </div>
  );
}