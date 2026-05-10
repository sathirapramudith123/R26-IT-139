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
import { procurementApi } from "@/services/api/procurement.api";

function Info({ label, value, highlight }) {
  const c=highlight==="green"?"text-emerald-600":highlight==="red"?"text-red-500":"text-slate-800";
  return <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-medium text-slate-400">{label}</p><p className={`mt-0.5 text-sm font-semibold capitalize ${c}`}>{String(value??"—").replaceAll("_"," ")}</p></div>;
}

function money(v){ return `LKR ${Number(v||0).toLocaleString()}`; }

export default function ProcurementDetailPage() {
  useAuthGuard();
  const { procurementId } = useParams(); const router = useRouter();
  const [item,setItem]=useState(null); const [loading,setLoading]=useState(true); const [deleting,setDeleting]=useState(false);

  useEffect(()=>{
    if(!procurementId) return;
    procurementApi.getById(procurementId).then(setItem).catch(()=>setItem(null)).finally(()=>setLoading(false));
  },[procurementId]);

  async function handleDelete() {
    if(!confirm("Delete this procurement decision?")) return;
    setDeleting(true);
    try { await procurementApi.remove(procurementId); router.push("/dashboard/procurement"); }
    catch(e){ alert(e.message||"Failed"); } finally { setDeleting(false); }
  }

  return (
    <div className="page-container">
      <PageHeader title="Procurement Decision" description="Supplier selection and cost breakdown."
        action={<Link href="/dashboard/procurement"><Button variant="secondary">← Back</Button></Link>} />
      {loading?<LoadingSpinner/>:!item?<Card><p className="text-slate-500">Record not found.</p></Card>:(
        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex flex-col gap-4 border-b pb-4 md:flex-row md:items-start md:justify-between">
              <div><h2 className="font-outfit text-2xl font-bold text-slate-900">{item.item_name||"Procurement Decision"}</h2><p className="mt-1 text-xs text-slate-400">ID: {item.id}</p></div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={item.status}/>
                <Link href={`/dashboard/procurement/${item.id}/edit`}><Button variant="primary" size="sm">Edit</Button></Link>
                <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>{deleting?"Deleting...":"Delete"}</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Info label="Item" value={item.item_name}/>
              <Info label="Quantity" value={item.quantity}/>
              <Info label="Delivery Location" value={item.delivery_location}/>
              <Info label="Required Date" value={item.required_delivery_date?new Date(item.required_delivery_date).toLocaleDateString("en-LK"):"—"}/>
            </div>
          </Card>
          <Card>
            <h3 className="mb-4 font-outfit text-base font-semibold text-slate-800">Selected Supplier & Cost Breakdown</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Info label="Supplier" value={item.selected_supplier_name}/>
              <Info label="Unit Price" value={money(item.unit_price)}/>
              <Info label="Delivery Cost" value={money(item.delivery_cost)}/>
              <Info label="Total Cost" value={money(item.total_cost)}/>
              <Info label="Est. Profit" value={money(item.estimated_profit)} highlight={Number(item.estimated_profit)>=0?"green":"red"}/>
              <Info label="Final Score" value={`${Number(item.final_score||0).toFixed(1)} / 100`}/>
              <Info label="Decision Type" value={item.decision_type}/>
              <Info label="Status" value={item.status}/>
            </div>
          </Card>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <strong>{item.selected_supplier_name||"This supplier"}</strong> was selected for having the best combined score across cost efficiency, profit margin, reliability, and delivery performance.
          </div>
        </div>
      )}
    </div>
  );
}