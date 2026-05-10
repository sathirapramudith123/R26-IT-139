"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { inventoryApi } from "@/services/api/inventory.api";
import { supplierApi } from "@/services/api/supplier.api";

const UNITS = [
  { label: "Kilogram (kg)", value: "kg" },
  { label: "Gram (g)",      value: "g"  },
  { label: "Liter (l)",     value: "l"  },
  { label: "Milliliter (ml)", value: "ml" },
  { label: "Unit",          value: "unit" },
  { label: "Box",           value: "box" },
  { label: "Carton",        value: "carton" },
];

function validate(v) {
  const e = {};
  if (!v.name?.trim())        e.name        = "Item name is required.";
  if (!v.supplier_id)         e.supplier_id = "Please select a supplier.";
  if (v.quantity === "" || isNaN(Number(v.quantity)) || Number(v.quantity) < 0)
    e.quantity = "Enter a valid quantity (0 or more).";
  if (v.reorder_level === "" || isNaN(Number(v.reorder_level)) || Number(v.reorder_level) < 0)
    e.reorder_level = "Enter a valid reorder level (0 or more).";
  if (!v.unit_price || isNaN(Number(v.unit_price)) || Number(v.unit_price) <= 0)
    e.unit_price = "Enter a price greater than 0.";
  return e;
}

export default function InventoryForm({ initialData = {}, itemId = null }) {
  const router = useRouter();
  const isEdit = !!itemId;
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [values, setValues] = useState({
    name:          initialData.name          ?? "",
    supplier_id:   initialData.supplier_id   ?? "",
    quantity:      initialData.quantity      ?? "",
    reorder_level: initialData.reorder_level ?? "",
    unit:          initialData.unit          ?? "unit",
    unit_price:    initialData.unit_price    ?? "",
  });

  useEffect(() => {
    supplierApi.list()
      .then(d => setSuppliers(Array.isArray(d) ? d : []))
      .catch(e => setServerError(e.message || "Failed to load suppliers"))
      .finally(() => setLoadingSuppliers(false));
  }, []);

  function set(k, v) {
    setValues(prev => ({ ...prev, [k]: v }));
    setFieldErrors(prev => ({ ...prev, [k]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate(values);
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setSaving(true); setServerError(null);
    const sup = suppliers.find(s => s.id === values.supplier_id);
    const payload = {
      ...values,
      supplier_name: sup?.name ?? "",
      quantity:      Number(values.quantity),
      reorder_level: Number(values.reorder_level),
      unit_price:    Number(values.unit_price),
    };
    try {
      if (isEdit) {
        await inventoryApi.update(itemId, payload);
        router.push(`/dashboard/inventory/${itemId}`);
      } else {
        await inventoryApi.create(payload);
        router.push("/dashboard/inventory");
      }
    } catch (err) {
      setServerError(err.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const cls = k =>
    `input-field ${fieldErrors[k] ? "border-red-400 ring-2 ring-red-100 focus:border-red-400 focus:ring-red-100" : ""}`;

  if (loadingSuppliers) return <LoadingSpinner label="Loading suppliers..." />;
  if (suppliers.length === 0)
    return (
      <div className="card max-w-lg">
        <p className="text-sm text-slate-600">
          No suppliers found.{" "}
          <Link href="/dashboard/suppliers/create" className="text-teal-700 underline">
            Add a supplier first
          </Link>.
        </p>
      </div>
    );

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-4xl space-y-6">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Item Name" error={fieldErrors.name} required>
          <input className={cls("name")} value={values.name}
            onChange={e => set("name", e.target.value)} placeholder="e.g. Rice 5 kg bag" />
        </FormField>

        <FormField label="Supplier" error={fieldErrors.supplier_id} required>
          <select className={cls("supplier_id")} value={values.supplier_id}
            onChange={e => set("supplier_id", e.target.value)}>
            <option value="">Select supplier</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name} — {s.company_name ?? "N/A"}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Quantity" error={fieldErrors.quantity} required>
          <input className={cls("quantity")} type="number" min="0" step="0.01"
            value={values.quantity} onChange={e => set("quantity", e.target.value)} />
        </FormField>

        <FormField label="Reorder Level" error={fieldErrors.reorder_level}
          hint="Alert is triggered when quantity falls to this level." required>
          <input className={cls("reorder_level")} type="number" min="0" step="0.01"
            value={values.reorder_level} onChange={e => set("reorder_level", e.target.value)} />
        </FormField>

        <FormField label="Unit">
          <select className="select-field" value={values.unit} onChange={e => set("unit", e.target.value)}>
            {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </FormField>

        <FormField label="Unit Price (LKR)" error={fieldErrors.unit_price} required>
          <input className={cls("unit_price")} type="number" min="0.01" step="0.01"
            value={values.unit_price} onChange={e => set("unit_price", e.target.value)} />
        </FormField>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link href="/dashboard/inventory">
          <Button variant="secondary" type="button">Cancel</Button>
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? (isEdit ? "Updating..." : "Saving...") : (isEdit ? "Update Item" : "Add Item")}
        </Button>
      </div>
    </form>
  );
}