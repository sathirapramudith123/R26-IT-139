"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { ROLES } from "@/lib/constants/index";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useAgencyBanking from "@/hooks/useAgencyBanking";

function fmt(v){ return `LKR ${Number(v||0).toLocaleString()}`; }

export default function AgencyBankingSummaryPage() {
  useAuthGuard(ROLES.BANK_AGENT);
  const { items, summary, loading, error, fetchAll } = useAgencyBanking();
  const [selectedDate,setSelectedDate]=useState(()=>new Date().toISOString().slice(0,10));
  useEffect(()=>{ fetchAll(); },[fetchAll]);

  const availableDates = useMemo(()=>{
    const seen=new Set();
    items.forEach(i=>{ const d=new Date(i.created_at).toISOString().slice(0,10); seen.add(d); });
    return [...seen].sort((a,b)=>b.localeCompare(a));
  },[items]);

  const dayItems = useMemo(()=>items.filter(i=>new Date(i.created_at).toDateString()===new Date(selectedDate).toDateString()),[items,selectedDate]);
  const dayTotals = useMemo(()=>({
    count:dayItems.length,
    amount:dayItems.reduce((s,i)=>s+(i.amount||0),0),
    fees:dayItems.reduce((s,i)=>s+(i.service_fee||0),0),
    commission:dayItems.reduce((s,i)=>s+(i.commission||0),0),
  }),[dayItems]);

  return (
    <div className="page-container">
      <PageHeader title="Daily Summary" description="Commission earned and transaction volume by day."
        action={<Link href="/dashboard/agency-banking"><Button variant="secondary">← All Transactions</Button></Link>} />
      {summary&&!loading&&(
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">All-time totals</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[["Transactions",summary.total_transactions],["Volume",fmt(summary.total_amount)],["Service Fees",fmt(summary.total_service_fees)],["Commission",fmt(summary.total_commission)]].map(([l,v])=>(
              <div key={l}><p className="text-xs text-slate-400">{l}</p><p className="mt-0.5 text-base font-bold text-slate-800">{v}</p></div>
            ))}
          </div>
        </div>
      )}
      {loading?<LoadingSpinner label="Loading summary data..."/>:
       items.length===0?<EmptyState icon="📊" title="No transactions yet" description="Create agency banking transactions to see daily summaries." action={<Link href="/dashboard/agency-banking/create"><Button>New Transaction</Button></Link>}/>:(
        <>
          <Card className="mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none" />
              <div className="flex flex-wrap gap-2">
                {availableDates.slice(0,5).map(d=>(
                  <button key={d} onClick={()=>setSelectedDate(d)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${selectedDate===d?"bg-teal-700 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {new Date(d).toLocaleDateString("en-LK",{month:"short",day:"numeric"})}
                  </button>
                ))}
              </div>
            </div>
          </Card>
          {dayItems.length===0?<Card><p className="text-sm text-slate-500">No transactions on {new Date(selectedDate).toLocaleDateString("en-LK")}.</p></Card>:(
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-4">
                {[["Transactions",dayTotals.count,"text-slate-800"],["Volume",fmt(dayTotals.amount),"text-slate-800"],["Fees",fmt(dayTotals.fees),"text-blue-600"],["Commission",fmt(dayTotals.commission),"text-emerald-600"]].map(([l,v,c])=>(
                  <Card key={l}><p className="text-xs font-medium text-slate-400">{l}</p><p className={`mt-1 text-xl font-bold ${c}`}>{v}</p></Card>
                ))}
              </div>
              <div className="space-y-2">
                {dayItems.map(item=>(
                  <Link key={item.id} href={`/dashboard/agency-banking/${item.id}`} className="block">
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 transition hover:border-slate-300">
                      <div>
                        <p className="text-sm font-semibold capitalize text-slate-800">{item.transaction_type?.replaceAll("_"," ")}</p>
                        <p className="text-xs text-slate-400">{item.customer_name} · {item.reference_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">{fmt(item.amount)}</p>
                        <p className="text-xs text-emerald-600">+{fmt(item.commission)} commission</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
