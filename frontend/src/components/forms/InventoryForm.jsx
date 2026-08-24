"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { inventoryApi } from "@/services/api/inventory";
import { supplierApi } from "@/services/api/supplier";
import { INVENTORY_UNITS } from "@/lib/constants";

// AI Models (C2/C3) සඳහා Pre-defined Categories
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
    name:          initialData.name          ?? "",
    category:      initialData.category      ?? "",
    supplier_name: initialData.supplier_name ?? "",
    quantity:      initialData.quantity      ?? "",
    reorder_level: initialData.reorder_level ?? "",
    unit:          initialData.unit          ?? "unit",
    cost_price:    initialData.cost_price    ?? initialData.unit_price ?? "",
    selling_price: initialData.selling_price ?? initialData.unit_price ?? "",
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

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (!v.name.trim()) er.name = "Item name is required.";
    if (!v.category) er.category = "Please select a category for AI forecasting.";
    if (v.quantity === "" || Number(v.quantity) < 0) er.quantity = "Enter a valid quantity (0 or more).";
    if (v.cost_price !== "" && Number(v.cost_price) < 0) er.cost_price = "Cost price cannot be negative.";
    if (v.selling_price !== "" && Number(v.selling_price) < 0) er.selling_price = "Selling price cannot be negative.";

    if (Object.keys(er).length) { setErrors(er); return; }
    
    setSaving(true); setServerError(null);

    const payload = {
      ...v,
      quantity: Number(v.quantity),
      reorder_level: v.reorder_level === "" ? 0 : Number(v.reorder_level),
      cost_price: v.cost_price === "" ? 0 : Number(v.cost_price),
      selling_price: v.selling_price === "" ? 0 : Number(v.selling_price),
      // Backward compatibility for existing backend APIs using unit_price
      unit_price: v.selling_price === "" ? 0 : Number(v.selling_price),
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

        {/* C2 Demand Forecasting සඳහා අලුතින් එකතු වූ Category Dropdown */}
        <FormField label="Category" error={errors.category} required hint="Required for AI Demand Forecasting">
          <select className="select-field" value={v.category} onChange={e => set("category", e.target.value)}>
            <option value="">Select Category...</option>
            {ITEM_CATEGORIES.map(cat => (
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

        <FormField label="Reorder Level" hint="Alert when quantity falls to this level">
          <input className="input-field" type="number" min="0" step="0.01" value={v.reorder_level} onChange={e => set("reorder_level", e.target.value)} />
        </FormField>

        {/* C1/C3 සඳහා වෙනස් කරන ලද Cost Price & Selling Price Fields */}
        <FormField label="Cost Price per Unit (LKR)" error={errors.cost_price} hint="Buying price (For Procurement/Profit AI)">
          <input className={cls("cost_price")} type="number" min="0" step="0.01" value={v.cost_price} onChange={e => set("cost_price", e.target.value)} placeholder="e.g. 1100.00" />
        </FormField>

        <FormField label="Selling Price per Unit (LKR)" error={errors.selling_price} hint="Selling price (For Sales Form Auto-fill)">
          <input className={cls("selling_price")} type="number" min="0" step="0.01" value={v.selling_price} onChange={e => set("selling_price", e.target.value)} placeholder="e.g. 1252.50" />
        </FormField>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <Link href="/dashboard/inventory"><Button variant="secondary" type="button">Cancel</Button></Link>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (isEdit ? "Update Item" : "Add Item")}</Button>
      </div>
    </form>
  );
}