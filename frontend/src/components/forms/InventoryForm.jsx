"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { inventoryApi } from "@/services/api/inventory";
import { supplierApi } from "@/services/api/supplier";
import { INVENTORY_UNITS } from "@/lib/constants";

const ITEM_CATEGORIES = [
  "Rice & Grains",
  "Beverages",
  "Dairy & Bakery",
  "Snacks & Sweets",
  "Canned & Packaged Food",
  "Household & Cleaning",
  "Personal Care",
  "Spices & Cooking Essentials",
  "Other"
];

export default function InventoryForm({ initialData = {}, itemId = null }) {
  const router = useRouter();
  const isEdit = !!itemId;
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);

  const [v, setV] = useState({
    name:           initialData.name          ?? "",
    category:       initialData.category      ?? "",
    supplier_name:  initialData.supplier_name ?? "",
    quantity:       initialData.quantity      ?? "",
    reorder_level:  initialData.reorder_level ?? "",
    unit:           initialData.unit          ?? "unit",
    cost_price:     initialData.cost_price    ?? initialData.unit_price ?? "",
    lead_time_days: initialData.lead_time_days ?? "1", // AI Safety Stock එක සඳහා
  });

  function set(k, val) {
    setV(p => ({ ...p, [k]: val }));
    setErrors(p => ({ ...p, [k]: undefined }));
  }

  useEffect(() => {
    supplierApi.list()
      .then((data) => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => setSuppliers([]));
  }, []);

  const supplierNames = suppliers.map((s) => s.name);
  const supplierOptions = [...supplierNames];
  if (v.supplier_name && !supplierNames.includes(v.supplier_name)) {
    supplierOptions.unshift(v.supplier_name);
  }

  // Categories වල අලුත් custom category එකක් තිබේ නම් dropdown එකට එකතු කිරීම
  const categoryOptions = [...ITEM_CATEGORIES];
  if (v.category && !categoryOptions.includes(v.category)) {
    categoryOptions.unshift(v.category);
  }

  // >>> Total Cost = Unit Cost × Quantity (live calculate — DB එකේ save වෙන්නෙ නෑ)
  const unitCost  = Number(v.cost_price) || 0;
  const qty       = Number(v.quantity)   || 0;
  const totalCost = unitCost * qty;

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (!v.name.trim()) er.name = "Item name is required.";
    if (!v.category) er.category = "Please select a category for AI forecasting.";
    if (v.quantity === "" || Number(v.quantity) < 0) er.quantity = "Enter a valid quantity (0 or more).";
    if (v.cost_price !== "" && Number(v.cost_price) < 0) er.cost_price = "Cost price cannot be negative.";

    if (Object.keys(er).length) { setErrors(er); return; }

    setSaving(true); setServerError(null);

    const payload = {
      ...v,
      quantity: Number(v.quantity),
      reorder_level: v.reorder_level === "" ? 0 : Number(v.reorder_level),
      cost_price: v.cost_price === "" ? 0 : Number(v.cost_price),
      lead_time_days: v.lead_time_days === "" ? 1 : Number(v.lead_time_days),
    };

    try {
      if (isEdit) await inventoryApi.update(itemId, payload);
      else await inventoryApi.create(payload);
      router.push("/dashboard/inventory");
    } catch (err) {
      setServerError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const cls = k => `input-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-3xl space-y-5">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Item Name" error={errors.name} required>
          <input className={cls("name")} value={v.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Rice 5kg" />
        </FormField>

        <FormField label="Category" error={errors.category} required hint="Required for AI Demand Forecasting">
          <select className="select-field" value={v.category} onChange={e => set("category", e.target.value)}>
            <option value="">Select Category...</option>
            {categoryOptions.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Supplier"
          hint={supplierOptions.length === 0 ? "No suppliers yet — add one first, or type a name." : "Choose from your suppliers"}
        >
          {supplierOptions.length > 0 ? (
            <select
              className="select-field"
              value={v.supplier_name}
              onChange={(e) => set("supplier_name", e.target.value)}
            >
              <option value="">Select a supplier</option>
              {supplierOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <input
              className="input-field"
              value={v.supplier_name}
              onChange={(e) => set("supplier_name", e.target.value)}
              placeholder="e.g. ABC Traders"
            />
          )}
        </FormField>

        <FormField label="Unit">
          <select className="select-field" value={v.unit} onChange={e => set("unit", e.target.value)}>
            {INVENTORY_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </FormField>

        <FormField label="Initial Quantity" error={errors.quantity} required>
          <input className={cls("quantity")} type="number" min="0" step="0.01" value={v.quantity} onChange={e => set("quantity", e.target.value)} />
        </FormField>

        <FormField label="Reorder Level" hint="Alert threshold (Auto-calculated by AI if empty)">
          <input className="input-field" type="number" min="0" step="0.01" value={v.reorder_level} onChange={e => set("reorder_level", e.target.value)} placeholder="Default: Auto AI" />
        </FormField>

        <FormField label="Unit Cost per Unit (LKR)" error={errors.cost_price} hint="Buying price per unit">
          <input className={cls("cost_price")} type="number" min="0" step="0.01" value={v.cost_price} onChange={e => set("cost_price", e.target.value)} placeholder="e.g. 1100.00" />
        </FormField>

        {/* >>> Selling Price ain kala. Ee wenuwata Total Cost (read-only) */}
        <FormField
          label="Total Cost (LKR)"
          hint={`Unit Cost × Quantity  =  ${unitCost.toFixed(2)} × ${qty}`}
        >
          <input
            className="input-field bg-slate-100 font-semibold text-slate-700 cursor-not-allowed dark:bg-slate-800"
            type="text"
            value={totalCost.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            readOnly
            tabIndex={-1}
          />
        </FormField>

        <FormField label="Item Delivery Lead Time (Days)" error={errors.lead_time_days} hint="Expected delivery time (Used for Dynamic Safety Stock)">
          <input className={cls("lead_time_days")} type="number" min="0" step="1" value={v.lead_time_days} onChange={e => set("lead_time_days", e.target.value)} placeholder="e.g. 1" />
        </FormField>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <Link href="/dashboard/inventory"><Button variant="secondary" type="button">Cancel</Button></Link>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (isEdit ? "Update Item" : "Add Item")}</Button>
      </div>
    </form>
  );
}