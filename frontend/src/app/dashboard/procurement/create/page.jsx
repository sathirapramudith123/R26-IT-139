"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { procurementApi } from "@/services/api/procurement.api";

export default function CreateProcurementPage() {
  useAuthGuard();
  const router = useRouter();
  const [results,setResults]=useState([]); const [requestData,setRequestData]=useState({});
  const [loading,setLoading]=useState(false); const [error,setError]=useState(null); const [savingId,setSavingId]=useState(null);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError(null); setResults([]);
    const v=Object.fromEntries(new FormData(e.currentTarget).entries());
    v.quantity=Number(v.quantity); v.expected_selling_price=Number(v.expected_selling_price);
    v.required_delivery_date=new Date(v.required_delivery_date).toISOString();
    setRequestData(v);
    try {
      const d=await procurementApi.recommend(v);
      setResults(Array.isArray(d)?d:[]);
      if(Array.isArray(d)&&d.length===0) setError("No suitable suppliers found. Check that active suppliers have unit price, available quantity, and estimated delivery date set.");
    } catch(e){ setError(e.message||"Failed to fetch recommendations"); }
    finally { setLoading(false); }
  }

  async function handleSave(s) {
    setSavingId(s.supplier_id);
    try {
      const saved=await procurementApi.create({
        item_name:requestData.item_name||"Unknown",
        quantity:requestData.quantity,
        delivery_location:requestData.delivery_location,
        required_delivery_date:requestData.required_delivery_date,
        expected_selling_price:requestData.expected_selling_price,
        selected_supplier_id:s.supplier_id,
        selected_supplier_name:s.supplier_name,
        unit_price:s.unit_price,
        delivery_cost:s.delivery_cost,
        total_cost:s.total_cost,
        estimated_profit:s.estimated_profit,
        final_score:s.final_score,
        status:"pending",
      });
      router.push(`/dashboard/procurement/${saved.id}`);
    } catch(e){ alert(e.message||"Failed to save"); setSavingId(null); }
  }

  function money(v){ return `LKR ${Number(v||0).toLocaleString()}`; }

  return (
    <div className="page-container">
      <PageHeader title="Smart Procurement" description="Enter requirements and get ranked supplier recommendations."
        action={<Link href="/dashboard/procurement"><Button variant="secondary">← All Decisions</Button></Link>} />

      <form onSubmit={handleSubmit} className="card-elevated space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Item Name" name="item_name" type="text" required placeholder="e.g. Rice 5kg bag"/>
          <Input label="Quantity" name="quantity" type="number" min="0.01" step="0.01" required/>
          <Input label="Delivery Location" name="delivery_location" type="text" required placeholder="e.g. Colombo"/>
          <Input label="Required Delivery Date" name="required_delivery_date" type="date" required/>
          <div className="md:col-span-2"><Input label="Expected Selling Price (LKR)" name="expected_selling_price" type="number" min="0.01" step="0.01" required/></div>
        </div>
        <Button type="submit" disabled={loading}>{loading?"Analysing suppliers...":"Get Recommendations"}</Button>
      </form>

      {loading && <LoadingSpinner label="Analysing suppliers..."/>}
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {results.length>0&&(
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-outfit text-lg font-semibold text-slate-800">{results.length} supplier{results.length!==1?"s":""} found</h2>
            <p className="text-xs text-slate-400">Ranked by final score (best first)</p>
          </div>
          {results.map(s=>(
            <div key={s.supplier_id} className={`rounded-2xl border bg-white p-5 ${s.rank===1?"border-emerald-300 ring-1 ring-emerald-100":"border-slate-200"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.rank===1?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-500"}`}>#{s.rank}</div>
                  <div>
                    <h3 className="font-outfit text-base font-bold text-slate-900">{s.supplier_name}</h3>
                    {s.rank===1&&<span className="mt-0.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Best match</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Final score</p>
                  <p className="text-xl font-bold text-slate-800">{Number(s.final_score||0).toFixed(1)}<span className="text-sm font-normal text-slate-400">/100</span></p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Unit Price",money(s.unit_price)],["Delivery Cost",money(s.delivery_cost)],["Total Cost",money(s.total_cost)],["Est. Profit",money(s.estimated_profit)]].map(([l,v])=>(
                  <div key={l} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-xs text-slate-400">{l}</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{v}</p></div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[["Cost 40%",s.cost_score],["Profit 30%",s.profit_score],["Reliability 20%",s.reliability_score],["Delivery 10%",s.delivery_score]].map(([l,v])=>{
                  const pct=Math.min(100,Math.max(0,Number(v||0)));
                  const col=pct>=70?"bg-emerald-400":pct>=40?"bg-amber-400":"bg-red-400";
                  return (
                    <div key={l} className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                      <div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500">{l}</span><span className="text-xs font-bold text-slate-700">{Number(v||0).toFixed(1)}</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${col}`} style={{width:`${pct}%`}}/></div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex justify-end">
                <button onClick={()=>handleSave(s)} disabled={savingId===s.supplier_id}
                  className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
                  {savingId===s.supplier_id?"Saving...":"Save this decision"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
