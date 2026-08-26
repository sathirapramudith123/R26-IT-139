"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { supplierApi } from "@/services/api/supplier";
import { isValidEmail } from "@/lib/validators";

// Delivery Location dropdown list (Sri Lankan Districts)
// ඕන නම් මේ list එක @/lib/constants එකට move කරන්නත් පුළුවන්
const DELIVERY_LOCATIONS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale",
  "Nuwara Eliya", "Galle", "Matara", "Hambantota", "Jaffna",
  "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu", "Batticaloa",
  "Ampara", "Trincomalee", "Kurunegala", "Puttalam", "Anuradhapura",
  "Polonnaruwa", "Badulla", "Monaragala", "Ratnapura", "Kegalle",
];

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
    delivery_location:  initialData.delivery_location  ?? "",
    delivery_cost:      initialData.delivery_cost      ?? "",
    available_quantity: initialData.available_quantity ?? "",
    lead_time_days:     initialData.lead_time_days     ?? "1", // AI Reorder Safety Stock Model සඳහා
  });

  function set(k, val) {
    setV(p => ({ ...p, [k]: val }));
    setErrors(p => ({ ...p, [k]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};

    // 1. Basic Required Validation
    if (!v.name.trim()) er.name = "Supplier name is required.";

    // 2. Contact Number Format Check (Sri Lankan / General 9-10 Digits)
    const cleanPhone = v.contact_number.replace(/\D/g, "");
    if (!v.contact_number.trim()) {
      er.contact_number = "Contact number is required.";
    } else if (cleanPhone.length < 9 || cleanPhone.length > 12) {
      er.contact_number = "Enter a valid contact number (e.g. 0771234567).";
    }

    // 3. Email Check
    if (v.email && !isValidEmail(v.email)) {
      er.email = "Enter a valid email address.";
    }

    // 4. Numeric Inputs Non-negative Validation
    if (v.delivery_cost !== "" && Number(v.delivery_cost) < 0) {
      er.delivery_cost = "Delivery cost cannot be negative.";
    }
    if (v.available_quantity !== "" && Number(v.available_quantity) < 0) {
      er.available_quantity = "Available quantity cannot be negative.";
    }
    if (v.lead_time_days !== "" && Number(v.lead_time_days) < 0) {
      er.lead_time_days = "Lead time cannot be negative.";
    }

    // Errors තිබේ නම් Form Submission එක නතර කිරීම
    if (Object.keys(er).length) { setErrors(er); return; }

    setSaving(true);
    setServerError(null);

    // Backend Payload එක සකස් කිරීම (Numbers බවට Convert කිරීම)
    const payload = {
      ...v,
      delivery_cost: v.delivery_cost === "" ? 0 : Number(v.delivery_cost),
      available_quantity: v.available_quantity === "" ? 0 : Number(v.available_quantity),
      lead_time_days: v.lead_time_days === "" ? 1 : Number(v.lead_time_days),
    };

    try {
      if (isEdit) await supplierApi.update(supplierId, payload);
      else await supplierApi.create(payload);
      router.push("/dashboard/suppliers");
    } catch (err) {
      setServerError(err.message || "Failed to save supplier details.");
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
        <FormField label="Supplier Name" error={errors.name} required>
          <input className={cls("name")} value={v.name} onChange={e => set("name", e.target.value)} placeholder="e.g. ABC Traders" />
        </FormField>

        <FormField label="Company Name">
          <input className="input-field" value={v.company_name} onChange={e => set("company_name", e.target.value)} placeholder="e.g. ABC Holdings (Pvt) Ltd" />
        </FormField>

        <FormField label="Contact Number" error={errors.contact_number} required>
          <input className={cls("contact_number")} value={v.contact_number} onChange={e => set("contact_number", e.target.value)} placeholder="0771234567" />
        </FormField>

        <FormField label="Email" error={errors.email}>
          <input className={cls("email")} type="email" value={v.email} onChange={e => set("email", e.target.value)} placeholder="supplier@example.com" />
        </FormField>

        {/* Delivery Location Dropdown */}
        <FormField label="Delivery Location" hint="District supplier delivers to">
          <select className="select-field" value={v.delivery_location} onChange={e => set("delivery_location", e.target.value)}>
            <option value="">Select delivery location</option>
            {DELIVERY_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </FormField>

        <FormField label="Delivery Cost (LKR)" error={errors.delivery_cost} hint="Fixed delivery fee per shipment">
          <input className={cls("delivery_cost")} type="number" min="0" step="0.01" value={v.delivery_cost} onChange={e => set("delivery_cost", e.target.value)} placeholder="0.00" />
        </FormField>

        <FormField label="Available Quantity" error={errors.available_quantity} hint="Stock quantity supplier can fulfill">
          <input className={cls("available_quantity")} type="number" min="0" step="0.01" value={v.available_quantity} onChange={e => set("available_quantity", e.target.value)} placeholder="0" />
        </FormField>

        {/* Dynamic Safety Stock Reorder Engine එකට අවශ්‍ය Lead Time */}
        <FormField label="Delivery Lead Time (Days)" error={errors.lead_time_days} hint="Days needed to deliver items (For AI Reorder Buffer)">
          <input className={cls("lead_time_days")} type="number" min="0" step="1" value={v.lead_time_days} onChange={e => set("lead_time_days", e.target.value)} placeholder="e.g. 2" />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Address" hint="Optional business/warehouse address">
            <textarea className="input-field resize-none" rows={2} value={v.address} onChange={e => set("address", e.target.value)} placeholder="Add business address..." />
          </FormField>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <Link href="/dashboard/suppliers"><Button variant="secondary" type="button">Cancel</Button></Link>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (isEdit ? "Update Supplier" : "Add Supplier")}</Button>
      </div>
    </form>
  );
}