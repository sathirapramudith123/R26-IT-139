"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { procurementApi } from "@/services/api/procurement.api";

const STATUSES = ["pending","approved","ordered","completed","cancelled"];

function validate(v) {
  const e = {};
  if (!v.item_name?.trim())          e.item_name           = "Item name is required.";
  if (!v.quantity || Number(v.quantity) <= 0) e.quantity   = "Enter a quantity greater than 0.";
  if (!v.delivery_location?.trim())  e.delivery_location   = "Delivery location is required.";
  if (!v.required_delivery_date)     e.required_delivery_date = "Select a required delivery date.";
  if (!v.expected_selling_price || Number(v.expected_selling_price) <= 0)
    e.expected_selling_price = "Enter a selling price greater than 0.";
  return e;
}

export default function ProcurementForm({ initialData = {}, procurementId = null }) {
  const router = useRouter();
  const isEdit = !!procurementId;
  const [saving, setSaving]           = useState(false);
  const [serverError, setServerError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [values, setValues] = useState({
    item_name:              initialData.item_name              ?? "",
    quantity:               initialData.quantity               ?? "",
    delivery_location:      initialData.delivery_location      ?? "",
    required_delivery_date: initialData.required_delivery_date
      ? String(initialData.required_delivery_date).slice(0, 10)
      : "",
    expected_selling_price: initialData.expected_selling_price ?? "",
    status:                 initialData.status                 ?? "pending",
    selected_supplier_name: initialData.selected_supplier_name ?? "",
    selected_supplier_id:   initialData.selected_supplier_id   ?? "",
    total_cost:             initialData.total_cost             ?? "",
    estimated_profit:       initialData.estimated_profit       ?? "",
  });

  function set(k, v) {
    setValues(p => ({ ...p, [k]: v }));
    setFieldErrors(p => ({ ...p, [k]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate(values);
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setSaving(true); setServerError(null);
    const payload = {
      ...values,
      quantity:               Number(values.quantity),
      expected_selling_price: Number(values.expected_selling_price),
      total_cost:             values.total_cost     ? Number(values.total_cost)     : undefined,
      estimated_profit:       values.estimated_profit ? Number(values.estimated_profit) : undefined,
      required_delivery_date: new Date(values.required_delivery_date).toISOString(),
    };
    try {
      if (isEdit) {
        await procurementApi.update(procurementId, payload);
        router.push(`/dashboard/procurement/${procurementId}`);
      } else {
        await procurementApi.create(payload);
        router.push("/dashboard/procurement");
      }
    } catch (err) {
      setServerError(err.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const cls = k =>
    `input-field ${fieldErrors[k] ? "border-red-400 ring-2 ring-red-100 focus:border-red-400 focus:ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-4xl space-y-6">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Item Name" error={fieldErrors.item_name} required>
          <input className={cls("item_name")} value={values.item_name}
            onChange={e => set("item_name", e.target.value)}
            placeholder="e.g. Rice 5 kg bag" />
        </FormField>

        <FormField label="Quantity" error={fieldErrors.quantity} required>
          <input className={cls("quantity")} type="number" min="0.01" step="0.01"
            value={values.quantity} onChange={e => set("quantity", e.target.value)} />
        </FormField>

        <FormField label="Delivery Location" error={fieldErrors.delivery_location} required>
          <input className={cls("delivery_location")} value={values.delivery_location}
            onChange={e => set("delivery_location", e.target.value)}
            placeholder="e.g. Colombo" />
        </FormField>

        <FormField label="Required Delivery Date" error={fieldErrors.required_delivery_date} required>
          <input className={cls("required_delivery_date")} type="date"
            value={values.required_delivery_date}
            onChange={e => set("required_delivery_date", e.target.value)} />
        </FormField>

        <FormField label="Expected Selling Price (LKR)"
          error={fieldErrors.expected_selling_price} required>
          <input className={cls("expected_selling_price")} type="number" min="0.01" step="0.01"
            value={values.expected_selling_price}
            onChange={e => set("expected_selling_price", e.target.value)}
            placeholder="0.00" />
        </FormField>

        {isEdit && (
          <FormField label="Status">
            <select className="select-field" value={values.status}
              onChange={e => set("status", e.target.value)}>
              {STATUSES.map(s => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {isEdit && (
          <>
            <FormField label="Selected Supplier Name">
              <input className="input-field" value={values.selected_supplier_name}
                onChange={e => set("selected_supplier_name", e.target.value)} />
            </FormField>
            <FormField label="Total Cost (LKR)">
              <input className="input-field" type="number" step="0.01"
                value={values.total_cost}
                onChange={e => set("total_cost", e.target.value)} />
            </FormField>
            <FormField label="Estimated Profit (LKR)">
              <input className="input-field" type="number" step="0.01"
                value={values.estimated_profit}
                onChange={e => set("estimated_profit", e.target.value)} />
            </FormField>
          </>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link href="/dashboard/procurement">
          <Button variant="secondary" type="button">Cancel</Button>
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : (isEdit ? "Update Decision" : "Save Decision")}
        </Button>
      </div>
    </form>
  );
}