"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { inventoryApi } from "@/services/api/inventory";
import { INVENTORY_UNITS } from "@/lib/constants";

export default function InventoryForm({ initialData = {}, itemId = null }) {
  const router = useRouter();
  const isEdit = !!itemId;
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});
  const [v, setV] = useState({
    name:          initialData.name          ?? "",
    supplier_name: initialData.supplier_name ?? "",
    quantity:      initialData.quantity      ?? "",
    reorder_level: initialData.reorder_level ?? "",
    unit:          initialData.unit          ?? "unit",
    unit_price:    initialData.unit_price    ?? "",
  });
  function set(k, val) { setV(p => ({ ...p, [k]: val })); setErrors(p => ({ ...p, [k]: undefined })); }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (!v.name.trim()) er.name = "Item name is required.";
    if (v.quantity === "" || Number(v.quantity) < 0) er.quantity = "Enter a valid quantity (0 or more).";
    if (v.unit_price !== "" && Number(v.unit_price) < 0) er.unit_price = "Price cannot be negative.";
    if (Object.keys(er).length) { setErrors(er); return; }
    setSaving(true); setServerError(null);
    const payload = {
      ...v,
      quantity: Number(v.quantity),
      reorder_level: v.reorder_level === "" ? 0 : Number(v.reorder_level),
      unit_price: v.unit_price === "" ? 0 : Number(v.unit_price),
    };
    try {
      if (isEdit) await inventoryApi.update(itemId, payload);
      else await inventoryApi.create(payload);
      router.push("/dashboard/inventory");
    } catch (err) { setServerError(err.message || "Save failed."); }
    finally { setSaving(false); }
  }
  const cls = k => `input-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-3xl space-y-5">
      {serverError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Item Name" error={errors.name} required>
          <input className={cls("name")} value={v.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Rice 5kg" />
        </FormField>
        <FormField label="Supplier Name" hint="Optional">
          <input className="input-field" value={v.supplier_name} onChange={e => set("supplier_name", e.target.value)} placeholder="e.g. ABC Traders" />
        </FormField>
        <FormField label="Quantity" error={errors.quantity} required>
          <input className={cls("quantity")} type="number" min="0" step="0.01" value={v.quantity} onChange={e => set("quantity", e.target.value)} />
        </FormField>
        <FormField label="Reorder Level" hint="Alert when quantity falls to this level">
          <input className="input-field" type="number" min="0" step="0.01" value={v.reorder_level} onChange={e => set("reorder_level", e.target.value)} />
        </FormField>
        <FormField label="Unit">
          <select className="select-field" value={v.unit} onChange={e => set("unit", e.target.value)}>
            {INVENTORY_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </FormField>
        <FormField label="Unit Price (LKR)" error={errors.unit_price}>
          <input className={cls("unit_price")} type="number" min="0" step="0.01" value={v.unit_price} onChange={e => set("unit_price", e.target.value)} placeholder="e.g. 1252.50" />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link href="/dashboard/inventory"><Button variant="secondary" type="button">Cancel</Button></Link>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (isEdit ? "Update Item" : "Add Item")}</Button>
      </div>
    </form>
  );
}