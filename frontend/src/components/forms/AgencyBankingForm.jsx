"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { agencyBankingApi } from "@/services/api/agencyBanking";
import { AGENCY_TRANSACTION_TYPES, CBSL_LIMITS } from "@/lib/constants";
import { isValidPhone } from "@/lib/validators";
import { formatCurrency } from "@/lib/formatters";

const STATUSES = ["completed", "pending", "failed"];

export default function AgencyBankingForm({ initialData = {}, agencyId = null }) {
  const router = useRouter();
  const isEdit = !!agencyId;
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});
  const [v, setV] = useState({
    customer_name:    initialData.customer_name    ?? "",
    customer_phone:   initialData.customer_phone   ?? "",
    transaction_type: initialData.transaction_type ?? "cash_deposit",
    amount:           initialData.amount           ?? "",
    service_fee:      initialData.service_fee      ?? "",
    commission:       initialData.commission       ?? "",
    created_offline:  initialData.created_offline  ?? false,
    status:           initialData.status           ?? "completed",
  });
  function set(k, val) { setV(p => ({ ...p, [k]: val })); setErrors(p => ({ ...p, [k]: undefined })); }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (!v.customer_name.trim()) er.customer_name = "Customer name is required.";
    if (!isValidPhone(v.customer_phone)) er.customer_phone = "Enter a valid Sri Lankan number.";
    if (!v.amount || Number(v.amount) <= 0) er.amount = "Enter an amount greater than 0.";
    const limit = CBSL_LIMITS[v.transaction_type];
    if (limit && Number(v.amount) > limit) er.amount = `CBSL limit is ${formatCurrency(limit)}.`;
    if (Object.keys(er).length) { setErrors(er); return; }
    setSaving(true); setServerError(null);
    const num = x => x === "" ? 0 : Number(x);
    const payload = { ...v, amount: Number(v.amount), service_fee: num(v.service_fee), commission: num(v.commission) };
    try {
      if (isEdit) await agencyBankingApi.update(agencyId, payload);
      else await agencyBankingApi.create(payload);
      router.push("/dashboard/agency-banking");
    } catch (err) { setServerError(err.message || "Save failed."); }
    finally { setSaving(false); }
  }
  const cls = k => `input-field ${errors[k] ? "border-red-400 ring-2 ring-red-100" : ""}`;
  const limit = CBSL_LIMITS[v.transaction_type];

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-3xl space-y-5">
      {serverError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Customer Name" error={errors.customer_name} required>
          <input className={cls("customer_name")} value={v.customer_name} onChange={e => set("customer_name", e.target.value)} placeholder="e.g. Nimal Perera" />
        </FormField>
        <FormField label="Customer Phone" error={errors.customer_phone} required>
          <input className={cls("customer_phone")} value={v.customer_phone} onChange={e => set("customer_phone", e.target.value)} placeholder="0771234567" />
        </FormField>
        <FormField label="Transaction Type" required>
          <select className="select-field" value={v.transaction_type} onChange={e => set("transaction_type", e.target.value)}>
            {AGENCY_TRANSACTION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
        <FormField label="Amount (LKR)" error={errors.amount} hint={limit ? `CBSL limit: ${formatCurrency(limit)}` : undefined} required>
          <input className={cls("amount")} type="number" min="0.01" step="0.01" value={v.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" />
        </FormField>
        <FormField label="Service Fee (LKR)">
          <input className="input-field" type="number" min="0" step="0.01" value={v.service_fee} onChange={e => set("service_fee", e.target.value)} />
        </FormField>
        <FormField label="Commission (LKR)">
          <input className="input-field" type="number" min="0" step="0.01" value={v.commission} onChange={e => set("commission", e.target.value)} />
        </FormField>
        {isEdit && (
          <FormField label="Status">
            <select className="select-field" value={v.status} onChange={e => set("status", e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </FormField>
        )}
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link href="/dashboard/agency-banking"><Button variant="secondary" type="button">Cancel</Button></Link>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : (isEdit ? "Update" : "Post Transaction")}</Button>
      </div>
    </form>
  );
}