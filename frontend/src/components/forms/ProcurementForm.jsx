"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { procurementApi } from "@/services/api/procurement";
import { supplierApi } from "@/services/api/supplier";
import { inventoryApi } from "@/services/api/inventory";
import { PROCUREMENT_STATUSES } from "@/lib/constants";

const DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
  "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
  "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
  "Monaragala", "Ratnapura", "Kegalle",
];

export default function ProcurementForm({ initialData = {}, procurementId = null }) {
  const router = useRouter();
  const isEdit = !!procurementId;
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);

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

  function set(k, val) {
    setV(p => ({ ...p, [k]: val }));
    setErrors(p => ({ ...p, [k]: undefined }));
  }

  // load inventory items + suppliers for the dropdowns
  useEffect(() => {
    supplierApi.list()
      .then((d) => setSuppliers(Array.isArray(d) ? d : []))
      .catch(() => setSuppliers([]));
    inventoryApi.list()
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);

  // keep a saved value visible even if it's no longer in the list (edit case)
  function withCurrent(list, current) {
    const names = list.filter(Boolean);
    if (current && !names.includes(current)) return [current, ...names];
    return names;
  }
  const supplierOptions = withCurrent(suppliers.map((s) => s.name), v.selected_supplier_name);
  const itemOptions     = withCurrent(items.map((i) => i.name), v.item_name);
  const districtOptions = withCurrent(DISTRICTS, v.delivery_location);

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
    } catch (err) {
      setServerError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const cls    = k => `input-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;
  const selCls = k => `select-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-3xl space-y-5">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        {/* Item Name — from inventory */}
        <FormField
          label="Item Name"
          error={errors.item_name}
          hint={itemOptions.length === 0 ? "No inventory items yet — type a name." : "Choose from your inventory"}
          required
        >
          {itemOptions.length > 0 ? (
            <select
              className={selCls("item_name")}
              value={v.item_name}
              onChange={(e) => set("item_name", e.target.value)}
            >
              <option value="">Select an item</option>
              {itemOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <input
              className={cls("item_name")}
              value={v.item_name}
              onChange={(e) => set("item_name", e.target.value)}
              placeholder="e.g. Rice 5kg"
            />
          )}
        </FormField>

        <FormField label="Quantity" error={errors.quantity} required>
          <input
            className={cls("quantity")}
            type="number" min="0.01" step="0.01"
            value={v.quantity}
            onChange={e => set("quantity", e.target.value)}
          />
        </FormField>

        {/* Delivery Location — Sri Lankan districts */}
        <FormField label="Delivery Location" hint="Select the district">
          <select
            className="select-field"
            value={v.delivery_location}
            onChange={(e) => set("delivery_location", e.target.value)}
          >
            <option value="">Select a district</option>
            {districtOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Expected Selling Price (LKR)">
          <input
            className="input-field"
            type="number" min="0" step="0.01"
            value={v.expected_selling_price}
            onChange={e => set("expected_selling_price", e.target.value)}
          />
        </FormField>

        {/* Selected Supplier — from suppliers */}
        <FormField
          label="Selected Supplier"
          hint={supplierOptions.length === 0 ? "No suppliers yet — add one first, or type a name." : "Choose from your suppliers"}
        >
          {supplierOptions.length > 0 ? (
            <select
              className="select-field"
              value={v.selected_supplier_name}
              onChange={(e) => set("selected_supplier_name", e.target.value)}
            >
              <option value="">Select a supplier</option>
              {supplierOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <input
              className="input-field"
              value={v.selected_supplier_name}
              onChange={(e) => set("selected_supplier_name", e.target.value)}
              placeholder="e.g. ABC Traders"
            />
          )}
        </FormField>

        <FormField label="Total Cost (LKR)">
          <input
            className="input-field"
            type="number" min="0" step="0.01"
            value={v.total_cost}
            onChange={e => set("total_cost", e.target.value)}
          />
        </FormField>

        <FormField label="Estimated Profit (LKR)">
          <input
            className="input-field"
            type="number" step="0.01"
            value={v.estimated_profit}
            onChange={e => set("estimated_profit", e.target.value)}
          />
        </FormField>

        <FormField label="Status">
          <select
            className="select-field"
            value={v.status}
            onChange={e => set("status", e.target.value)}
          >
            {PROCUREMENT_STATUSES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <Link href="/dashboard/procurement">
          <Button variant="secondary" type="button">Cancel</Button>
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : (isEdit ? "Update" : "Save Decision")}
        </Button>
      </div>
    </form>
  );
}