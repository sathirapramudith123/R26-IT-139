"use client";
import { useState } from "react";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { isValidEmail, isRequired, isNonNegativeNumber, isPositiveNumber } from "@/lib/validators/index";

const STATUS_OPTIONS = [
  { label: "Active",   value: "active"   },
  { label: "Pending",  value: "pending"  },
  { label: "Inactive", value: "inactive" },
];

function validate(v) {
  const e = {};
  if (!isRequired(v.name))           e.name           = "Supplier name is required.";
  if (!isRequired(v.company_name))   e.company_name   = "Company name is required.";
  if (!isRequired(v.contact_number)) e.contact_number = "Contact number is required.";
  if (!isRequired(v.email))          e.email          = "Email is required.";
  else if (!isValidEmail(v.email))   e.email          = "Enter a valid email address.";
  if (!isRequired(v.item_name))      e.item_name      = "Item name is required.";
  if (!isPositiveNumber(v.unit_price))
    e.unit_price = "Enter a unit price greater than 0.";
  if (v.delivery_cost !== "" && !isNonNegativeNumber(v.delivery_cost))
    e.delivery_cost = "Enter a valid delivery cost (0 or more).";
  return e;
}

export default function SupplierForm({ onSubmit, submitLabel = "Save", initialData = {} }) {
  const [saving,      setSaving]      = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [values, setValues] = useState({
    name:           initialData.name           ?? "",
    company_name:   initialData.company_name   ?? "",
    contact_number: initialData.contact_number ?? "",
    email:          initialData.email          ?? "",
    address:        initialData.address        ?? "",
    status:         initialData.status         ?? "active",
    item_name:      initialData.item_name      ?? "",
    unit_price:     initialData.unit_price     ?? "",
    delivery_cost:  initialData.delivery_cost  ?? "",
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
      unit_price:    Number(values.unit_price   || 0),
      delivery_cost: Number(values.delivery_cost || 0),
    };
    try { await onSubmit(payload); }
    finally { setSaving(false); }
  }

  const cls = k =>
    `input-field ${fieldErrors[k]
      ? "border-red-400 ring-2 ring-red-100 focus:border-red-400 focus:ring-red-100"
      : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-3xl space-y-6">

      {/* Basic information */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Supplier information</p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField label="Supplier name" error={fieldErrors.name} required>
            <input className={cls("name")} value={values.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Nimal Perera" />
          </FormField>

          <FormField label="Company name" error={fieldErrors.company_name} required>
            <input className={cls("company_name")} value={values.company_name}
              onChange={e => set("company_name", e.target.value)}
              placeholder="e.g. Colombo Wholesale Traders" />
          </FormField>

          <FormField label="Contact number" error={fieldErrors.contact_number} required>
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
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Address" hint="Optional">
              <textarea className="input-field resize-none" rows={2}
                value={values.address}
                onChange={e => set("address", e.target.value)}
                placeholder="e.g. No. 45, Pettah, Colombo 11" />
            </FormField>
          </div>
        </div>
      </div>

      {/* What they sell and their price */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-800 mb-1">
            What does this supplier sell?
          </p>
          <p className="text-xs text-slate-500">
            Enter the item they supply and their price.
            The system uses this to match them to your procurement requests.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Item name" error={fieldErrors.item_name} required
            hint="The main item this supplier provides">
            <input className={cls("item_name")} value={values.item_name}
              onChange={e => set("item_name", e.target.value)}
              placeholder="e.g. Tomato, Rice, Red Onion" />
          </FormField>

          <FormField label="Unit price (LKR)" error={fieldErrors.unit_price} required
            hint="Their current price per unit">
            <input className={cls("unit_price")} type="number" min="0.01" step="0.01"
              value={values.unit_price}
              onChange={e => set("unit_price", e.target.value)}
              placeholder="0.00" />
          </FormField>

          <FormField label="Delivery cost (LKR)" error={fieldErrors.delivery_cost}
            hint="Total cost to deliver one order. Enter 0 if they deliver free.">
            <input className={cls("delivery_cost")} type="number" min="0" step="0.01"
              value={values.delivery_cost}
              onChange={e => set("delivery_cost", e.target.value)}
              placeholder="0.00" />
          </FormField>
        </div>
      </div>

      {/* How scores are built automatically */}
      <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-4 space-y-2">
        <p className="text-sm font-semibold text-teal-800">
          How procurement scores are built automatically
        </p>
        <p className="text-xs text-teal-700 leading-relaxed">
          You only need to enter what you know. The system builds the rest
          automatically from your order history with this supplier.
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 mt-2">
          {[
            ["Price score (40%)",       "Compared against HARTI government wholesale price average",   "teal"  ],
            ["Profit score (30%)",      "Your selling price minus total cost — calculated per order",  "teal"  ],
            ["Reliability score (20%)", "Completed orders ÷ total orders — built from your history",  "purple"],
            ["Delivery score (10%)",    "On-time delivery rate from saved decisions — builds over time", "purple"],
          ].map(([label, desc, color]) => (
            <div key={label}
              className={`rounded-lg px-3 py-2 text-xs
                ${color === "teal"
                  ? "bg-teal-100 border border-teal-200"
                  : "bg-purple-50 border border-purple-200"}`}>
              <p className={`font-semibold mb-0.5 ${color === "teal" ? "text-teal-800" : "text-purple-800"}`}>
                {label}
                <span className={`ml-1.5 text-[10px] font-normal ${color === "teal" ? "text-teal-600" : "text-purple-600"}`}>
                  {color === "teal" ? "from data" : "builds over time"}
                </span>
              </p>
              <p className={color === "teal" ? "text-teal-700" : "text-purple-700"}>{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-teal-600 pt-1">
          When you first add a supplier, reliability and delivery scores start at 50 (neutral).
          They improve automatically as you complete more procurement decisions with them.
        </p>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}