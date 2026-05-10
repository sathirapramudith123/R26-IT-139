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
import { supplierApi } from "@/services/api/supplier.api";

function Info({ label, value }) {
  return <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800 capitalize">{String(value??"—").replaceAll("_"," ")}</p></div>;
}

export default function SupplierDetailPage() {
  useAuthGuard();
  const { supplierId } = useParams(); const router = useRouter();
  const [item,setItem]=useState(null); const [loading,setLoading]=useState(true); const [deleting,setDeleting]=useState(false);

  useEffect(()=>{
    if(!supplierId) return;
    supplierApi.getById(supplierId).then(setItem).catch(()=>setItem(null)).finally(()=>setLoading(false));
  },[supplierId]);

  async function handleDelete() {
    if(!confirm("Delete this supplier?")) return;
    setDeleting(true);
    try { await supplierApi.remove(supplierId); router.push("/dashboard/suppliers"); }
    catch(e){ alert(e.message||"Failed"); } finally { setDeleting(false); }
  }

  return (
    <div className="page-container">
      <PageHeader title="Supplier Details" description="View supplier profile and performance scores."
        action={<Link href="/dashboard/suppliers"><Button variant="secondary">← Back</Button></Link>} />
      {loading?<LoadingSpinner/>:!item?<Card><p className="text-slate-500">Supplier not found.</p></Card>:(
        <Card className="w-full">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
            <div><h2 className="font-outfit text-2xl font-bold text-slate-900">{item.name}</h2><p className="mt-1 text-xs text-slate-400">{item.company_name}</p></div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={item.status}/>
              <Link href={`/dashboard/suppliers/${item.id}/edit`}><Button variant="primary" size="sm">Edit</Button></Link>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>{deleting?"Deleting...":"Delete"}</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Supplier Name" value={item.name}/>
            <Info label="Company" value={item.company_name}/>
            <Info label="Contact" value={item.contact_number}/>
            <Info label="Email" value={item.email}/>
            <Info label="Unit Price" value={`LKR ${Number(item.unit_price||0).toLocaleString()}`}/>
            <Info label="Delivery Cost" value={`LKR ${Number(item.delivery_cost||0).toLocaleString()}`}/>
            <Info label="Available Qty" value={item.available_quantity??0}/>
            <Info label="Price Score" value={item.price_score??0}/>
            <Info label="Reliability Score" value={item.reliability_score??0}/>
            <Info label="Delivery Score" value={item.delivery_score??0}/>
            <Info label="Total Score" value={Number(item.total_score??0).toFixed(1)}/>
            <Info label="Status" value={item.status}/>
          </div>
          {Number(item.total_score||0)>=75&&<div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Strong supplier — suitable for procurement recommendations.</div>}
          {Number(item.total_score||0)<50&&<div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Low score — review reliability and pricing before selecting.</div>}
        </Card>
      )}
    </div>
  );
}