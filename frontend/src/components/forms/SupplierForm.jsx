"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { supplierApi } from "@/services/api/supplier";
import { SUPPLIER_STATUSES } from "@/lib/constants";
import { isValidEmail } from "@/lib/validators";

export default function SupplierForm({ initialData = {}, supplierId = null }) {
  const router = useRouter();
  const isEdit = !!supplierId;
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});
  const [v, setV] = useState({
    name:               initialData.name               ?? "",
    company_name:       initialData.company_name       ?? "",
    contact_number:     initialData.contact_number     ?? "",
    email:              initialData.email              ?? "",
    address:            initialData.address            ?? "",
    unit_price:         initialData.unit_price         ?? "",
    delivery_cost:      initialData.delivery_cost      ?? "",
    available_quantity: initialData.available_quantity ?? "",
    status:             initialData.status             ?? "active",
  });
  function set(k, val) { setV(p => ({ ...p, [k]: val })); setErrors(p => ({ ...p, [k]: undefined })); }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (!v.name.trim()) er.name = "Supplier name is required.";
    if (!v.contact_number.trim()) er.contact_number = "Contact number is required.";
    if (v.email && !isValidEmail(v.email)) er.email = "Enter a valid email.";
    if (Object.keys(er).length) { setErrors(er); return; }
    setSaving(true); setServerError(null);
    const payload = {
      ...v,
      unit_price: v.unit_price === "" ? 0 : Number(v.unit_price),
      delivery_cost: v.delivery_cost === "" ? 0 : Number(v.delivery_cost),
      available_quantity: v.available_quantity === "" ? 0 : Number(v.available_quantity),
    };
    try {
      if (isEdit) await supplierApi.update(supplierId, payload);
      else await supplierApi.create(payload);
      router.push("/dashboard/suppliers");
    } catch (err) { setServerError(err.message || "Save failed."); }
    finally { setSaving(false); }
  }
  const cls = k => `input-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-3xl space-y-5">
      {serverError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Supplier Name" error={errors.name} required>
          <input className={cls("name")} value={v.name} onChange={e => set("name", e.target.value)} placeholder="e.g. ABC Traders" />
        </FormField>
        <FormField label="Company Name">
          <input className="input-field" value={v.company_name} onChange={e => set("company_name", e.target.value)} />
        </FormField>
        <FormField label="Contact Number" error={errors.contact_number} required>
          <input className={cls("contact_number")} value={v.contact_number} onChange={e => set("contact_number", e.target.value)} placeholder="0771234567" />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <input className={cls("email")} type="email" value={v.email} onChange={e => set("email", e.target.value)} />
        </FormField>
        <FormField label="Unit Price (LKR)">
          <input className="input-field" type="number" min="0" step="0.01" value={v.unit_price} onChange={e => set("unit_price", e.target.value)} />
        </FormField>
        <FormField label="Delivery Cost (LKR)">
          <input className="input-field" type="number" min="0" step="0.01" value={v.delivery_cost} onChange={e => set("delivery_cost", e.target.value)} />
        </FormField>
        <FormField label="Available Quantity">
          <input className="input-field" type="number" min="0" step="0.01" value={v.available_quantity} onChange={e => set("available_quantity", e.target.value)} />
        </FormField>
        <FormField label="Status">
          <select className="select-field" value={v.status} onChange={e => set("status", e.target.value)}>
            {SUPPLIER_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
        <div className="md:col-span-2">
          <FormField label="Address" hint="Optional">
            <textarea className="input-field resize-none" rows={2} value={v.address} onChange={e => set("address", e.target.value)} />
          </FormField>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link href="/dashboard/suppliers"><Button variant="secondary" type="button">Cancel</Button></Link>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (isEdit ? "Update Supplier" : "Add Supplier")}</Button>
      </div>
    </form>
  );
}