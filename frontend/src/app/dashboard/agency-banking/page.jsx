"use client";
import { useEffect, useMemo, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { ROLES } from "@/lib/constants/index";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useAgencyBanking from "@/hooks/useAgencyBanking";
import { agencyBankingApi } from "@/services/api/agencyBanking.api";

const COLS=[{key:"customer_name",label:"Customer"},{key:"customer_phone",label:"Phone"},{key:"transaction_type",label:"Type"},{key:"amount",label:"Amount"},{key:"service_fee",label:"Fee"},{key:"commission",label:"Commission"},{key:"status",label:"Status"},{key:"actions",label:""}];

export default function AgencyBankingPage() {
  useAuthGuard(ROLES.BANK_AGENT);
  const { items, summary, loading, error, fetchAll } = useAgencyBanking();
  const [search,setSearch]=useState(""); const [typeFilter,setTypeFilter]=useState("all"); const [deletingId,setDeletingId]=useState(null);
  useEffect(()=>{ fetchAll(); },[fetchAll]);

  async function handleDelete(id) {
    if(!confirm("Delete this transaction?")) return;
    try { setDeletingId(id); await agencyBankingApi.remove(id); await fetchAll(); }
    catch(e){ alert(e.message||"Failed"); } finally { setDeletingId(null); }
  }

  const filtered = useMemo(()=>{
    const kw=search.trim().toLowerCase();
    return items.filter(i=>{
      const ms=!kw||[i.customer_name,i.customer_phone,i.transaction_type,i.reference_number].join(" ").toLowerCase().includes(kw);
      const mt=typeFilter==="all"||i.transaction_type===typeFilter;
      return ms&&mt;
    });
  },[items,search,typeFilter]);

  const rows = filtered.map(item=>({
    ...item,
    transaction_type: <span className="capitalize">{item.transaction_type?.replaceAll("_"," ")}</span>,
    amount: `LKR ${Number(item.amount||0).toLocaleString()}`,
    service_fee: `LKR ${Number(item.service_fee||0).toLocaleString()}`,
    commission: `LKR ${Number(item.commission||0).toLocaleString()}`,
    status: <StatusBadge status={item.status}/>,
    actions:(
      <div className="flex gap-2">
        <Link href={`/dashboard/agency-banking/${item.id}`}><Button variant="ghost" size="sm">View</Button></Link>
        <Link href={`/dashboard/agency-banking/${item.id}/edit`}><Button variant="primary" size="sm">Edit</Button></Link>
        <Button variant="danger" size="sm" onClick={()=>handleDelete(item.id)} disabled={deletingId===item.id}>{deletingId===item.id?"Deleting...":"Delete"}</Button>
      </div>
    )
  }));

  return (
    <div className="page-container">
      <PageHeader title="Agency Banking" description="Manage customer banking transactions and track commission."
        action={<div className="flex gap-2"><Link href="/dashboard/agency-banking/create"><Button>+ New Transaction</Button></Link><Link href="/dashboard/agency-banking/summary"><Button variant="secondary">Daily Summary</Button></Link></div>} />
      {summary&&(
        <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[["Total Transactions",summary.total_transactions,"text-slate-800"],["Total Amount",`LKR ${Number(summary.total_amount||0).toLocaleString()}`,"text-slate-800"],["Service Fees",`LKR ${Number(summary.total_service_fees||0).toLocaleString()}`,"text-blue-600"],["Commission Earned",`LKR ${Number(summary.total_commission||0).toLocaleString()}`,"text-emerald-600"]].map(([l,v,c])=>(
            <Card key={l}><p className="text-xs font-medium text-slate-400">{l}</p><p className={`mt-1 text-xl font-bold ${c}`}>{v}</p></Card>
          ))}
        </div>
      )}
      <Card className="mb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input type="text" placeholder="Search by customer, phone, reference..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full lg:max-w-sm rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none" />
          <div className="flex gap-3">
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="select-field w-auto">
              <option value="all">All Types</option>
              <option value="cash_deposit">Cash Deposit</option>
              <option value="cash_withdrawal">Cash Withdrawal</option>
              <option value="fund_transfer">Fund Transfer</option>
              <option value="balance_inquiry">Balance Inquiry</option>
            </select>
            {(search||typeFilter!=="all")&&<Button variant="secondary" onClick={()=>{setSearch("");setTypeFilter("all");}}>Clear</Button>}
          </div>
        </div>
      </Card>
      {loading?<LoadingSpinner label="Loading transactions..."/>:
       error?<Card><p className="text-sm text-red-600">{error}</p></Card>:
       items.length===0?<EmptyState icon="🏦" title="No agency banking transactions" description="Create a simulated banking transaction." action={<Link href="/dashboard/agency-banking/create"><Button>New Transaction</Button></Link>}/>:
       filtered.length===0?<EmptyState icon="🔍" title="No matching transactions" action={<Button variant="secondary" onClick={()=>{setSearch("");setTypeFilter("all");}}>Clear</Button>}/>:
       <Table columns={COLS} rows={rows}/>}
    </div>
  );
}
