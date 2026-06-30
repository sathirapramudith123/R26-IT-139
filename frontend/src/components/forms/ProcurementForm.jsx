"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { procurementApi } from "@/services/api/procurement";
import { PROCUREMENT_STATUSES } from "@/lib/constants";

export default function ProcurementForm({ initialData = {}, procurementId = null }) {
  const router = useRouter();
  const isEdit = !!procurementId;
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});
  const [v, setV] = useState({
    item_name:              initialData.item_name              ?? "",
    quantity:               initialData.quantity               ?? "",
    delivery_location:      initialData.delivery_location      ?? "",
    expected_selling_price: initialData.expected_selling_price ?? "",
    selected_supplier_name: initialData.selected_supplier_name ?? "",
    total_cost:             initialData.total_cost             ?? "",
    estimated_profit:       initialData.estimated_profit       ?? "",
    status:                 initialData.status                 ?? "pending",
  });
  function set(k, val) { setV(p => ({ ...p, [k]: val })); setErrors(p => ({ ...p, [k]: undefined })); }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (!v.item_name.trim()) er.item_name = "Item name is required.";
    if (!v.quantity || Number(v.quantity) <= 0) er.quantity = "Enter a quantity greater than 0.";
    if (Object.keys(er).length) { setErrors(er); return; }
    setSaving(true); setServerError(null);
    const num = x => x === "" ? 0 : Number(x);
    const payload = {
      ...v,
      quantity: Number(v.quantity),
      expected_selling_price: num(v.expected_selling_price),
      total_cost: num(v.total_cost),
      estimated_profit: num(v.estimated_profit),
    };
    try {
      if (isEdit) await procurementApi.update(procurementId, payload);
      else await procurementApi.create(payload);
      router.push("/dashboard/procurement");
    } catch (err) { setServerError(err.message || "Save failed."); }
    finally { setSaving(false); }
  }
  const cls = k => `input-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-3xl space-y-5">
      {serverError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Item Name" error={errors.item_name} required>
          <input className={cls("item_name")} value={v.item_name} onChange={e => set("item_name", e.target.value)} placeholder="e.g. Rice 5kg" />
        </FormField>
        <FormField label="Quantity" error={errors.quantity} required>
          <input className={cls("quantity")} type="number" min="0.01" step="0.01" value={v.quantity} onChange={e => set("quantity", e.target.value)} />
        </FormField>
        <FormField label="Delivery Location">
          <input className="input-field" value={v.delivery_location} onChange={e => set("delivery_location", e.target.value)} placeholder="e.g. Kurunegala" />
        </FormField>
        <FormField label="Expected Selling Price (LKR)">
          <input className="input-field" type="number" min="0" step="0.01" value={v.expected_selling_price} onChange={e => set("expected_selling_price", e.target.value)} />
        </FormField>
        <FormField label="Selected Supplier">
          <input className="input-field" value={v.selected_supplier_name} onChange={e => set("selected_supplier_name", e.target.value)} />
        </FormField>
        <FormField label="Total Cost (LKR)">
          <input className="input-field" type="number" min="0" step="0.01" value={v.total_cost} onChange={e => set("total_cost", e.target.value)} />
        </FormField>
        <FormField label="Estimated Profit (LKR)">
          <input className="input-field" type="number" step="0.01" value={v.estimated_profit} onChange={e => set("estimated_profit", e.target.value)} />
        </FormField>
        <FormField label="Status">
          <select className="select-field" value={v.status} onChange={e => set("status", e.target.value)}>
            {PROCUREMENT_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link href="/dashboard/procurement"><Button variant="secondary" type="button">Cancel</Button></Link>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (isEdit ? "Update" : "Save Decision")}</Button>
      </div>
    </form>
  );
}