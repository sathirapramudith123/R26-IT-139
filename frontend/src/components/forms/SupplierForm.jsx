"use client";
import { useState } from "react";
import FormField from "./FormField";
import Button from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { label: "Active",   value: "active"   },
  { label: "Pending",  value: "pending"  },
  { label: "Inactive", value: "inactive" },
];


// Validation function (can be moved to a separate validators file if needed)
function validate(v) {
  const e = {};
  if (!v.name?.trim())         e.name         = "Supplier name is required.";
  if (!v.company_name?.trim()) e.company_name = "Company name is required.";
  if (!v.contact_number?.trim()) e.contact_number = "Contact number is required.";
  if (!v.email?.trim())        e.email        = "Email is required.";
  else if (!/^[^@]+@[^@]+\.[^@]+$/.test(v.email))
    e.email = "Enter a valid email address.";
  const price = Number(v.unit_price);
  if (!v.unit_price || isNaN(price) || price < 0) e.unit_price = "Enter a valid unit price.";
  const delivery = Number(v.delivery_cost);
  if (v.delivery_cost !== "" && (isNaN(delivery) || delivery < 0))
    e.delivery_cost = "Enter a valid delivery cost (0 or more).";
  const qty = Number(v.available_quantity);
  if (v.available_quantity !== "" && (isNaN(qty) || qty < 0))
    e.available_quantity = "Enter a valid quantity (0 or more).";
  ["price_score","reliability_score","delivery_score"].forEach(k => {
    const n = Number(v[k]);
    if (v[k] !== "" && (isNaN(n) || n < 0 || n > 100))
      e[k] = "Score must be between 0 and 100.";
  });
  return e;
}

export default function SupplierForm({ onSubmit, submitLabel = "Save", initialData = {} }) {
  const [saving, setSaving]           = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [values, setValues] = useState({
    name:               initialData.name               ?? "",
    company_name:       initialData.company_name       ?? "",
    contact_number:     initialData.contact_number     ?? "",
    email:              initialData.email              ?? "",
    address:            initialData.address            ?? "",
    status:             initialData.status             ?? "active",
    unit_price:         initialData.unit_price         ?? "",
    delivery_cost:      initialData.delivery_cost      ?? "",
    available_quantity: initialData.available_quantity ?? "",
    estimated_delivery_date: initialData.estimated_delivery_date
      ? String(initialData.estimated_delivery_date).slice(0, 10) : "",
    price_score:        initialData.price_score        ?? "0",
    reliability_score:  initialData.reliability_score  ?? "0",
    delivery_score:     initialData.delivery_score     ?? "0",
  });

  function set(k, v) {
    setValues(p => ({ ...p, [k]: v }));
    setFieldErrors(p => ({ ...p, [k]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate(values);
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setSaving(true);
    const payload = {
      ...values,
      unit_price:         Number(values.unit_price   || 0),
      delivery_cost:      Number(values.delivery_cost || 0),
      available_quantity: Number(values.available_quantity || 0),
      price_score:        Number(values.price_score   || 0),
      reliability_score:  Number(values.reliability_score || 0),
      delivery_score:     Number(values.delivery_score || 0),
      estimated_delivery_date: values.estimated_delivery_date
        ? new Date(values.estimated_delivery_date).toISOString()
        : null,
    };
    try { await onSubmit(payload); }
    finally { setSaving(false); }
  }

  const cls = k =>
    `input-field ${fieldErrors[k] ? "border-red-400 ring-2 ring-red-100 focus:border-red-400 focus:ring-red-100" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Supplier Name" error={fieldErrors.name} required>
          <input className={cls("name")} value={values.name}
            onChange={e => set("name", e.target.value)} placeholder="e.g. John Perera" />
        </FormField>

        <FormField label="Company Name" error={fieldErrors.company_name} required>
          <input className={cls("company_name")} value={values.company_name}
            onChange={e => set("company_name", e.target.value)}
            placeholder="e.g. Colombo Wholesale" />
        </FormField>

        <FormField label="Contact Number" error={fieldErrors.contact_number} required>
          <input className={cls("contact_number")} value={values.contact_number}
            onChange={e => set("contact_number", e.target.value)}
            placeholder="0771234567" />
        </FormField>

        <FormField label="Email" error={fieldErrors.email} required>
          <input className={cls("email")} type="email" value={values.email}
            onChange={e => set("email", e.target.value)}
            placeholder="supplier@example.com" />
        </FormField>

        <FormField label="Status">
          <select className="select-field" value={values.status}
            onChange={e => set("status", e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>

        <FormField label="Estimated Delivery Date">
          <input className="input-field" type="date" value={values.estimated_delivery_date}
            onChange={e => set("estimated_delivery_date", e.target.value)} />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Address">
            <textarea className="input-field resize-none" rows={3} value={values.address}
              onChange={e => set("address", e.target.value)} />
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="mb-4 font-outfit text-base font-semibold text-slate-800">Procurement Details</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <FormField label="Unit Price (LKR)" error={fieldErrors.unit_price} required>
            <input className={cls("unit_price")} type="number" min="0" step="0.01"
              value={values.unit_price} onChange={e => set("unit_price", e.target.value)}
              placeholder="0.00" />
          </FormField>

          <FormField label="Delivery Cost (LKR)" error={fieldErrors.delivery_cost}>
            <input className={cls("delivery_cost")} type="number" min="0" step="0.01"
              value={values.delivery_cost} onChange={e => set("delivery_cost", e.target.value)}
              placeholder="0.00" />
          </FormField>

          <FormField label="Available Quantity" error={fieldErrors.available_quantity}>
            <input className={cls("available_quantity")} type="number" min="0" step="0.01"
              value={values.available_quantity}
              onChange={e => set("available_quantity", e.target.value)} />
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="mb-1 font-outfit text-base font-semibold text-slate-800">Performance Scores</h3>
        <p className="mb-4 text-xs text-slate-400">Each score is 0 – 100. Used by the procurement DSS to rank this supplier.</p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            ["Price Score",       "price_score",       "Lower price → higher score."],
            ["Reliability Score", "reliability_score", "On-time delivery history."],
            ["Delivery Score",    "delivery_score",    "Speed and consistency."],
          ].map(([label, key, hint]) => (
            <FormField key={key} label={label} error={fieldErrors[key]} hint={hint}>
              <input className={cls(key)} type="number" min="0" max="100" step="0.01"
                value={values[key]} onChange={e => set(key, e.target.value)} />
            </FormField>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}