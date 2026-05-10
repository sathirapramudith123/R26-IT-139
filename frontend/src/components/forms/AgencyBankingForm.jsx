"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { agencyBankingApi } from "@/services/api/agencyBanking.api";
import { AGENCY_TRANSACTION_TYPES, CBSL_LIMITS } from "@/lib/constants/index";
import { formatCurrency } from "@/lib/formatters/index";

const STATUSES = ["completed", "pending", "failed"];

function validate(v) {
  const e = {};
  if (!v.customer_name?.trim())   e.customer_name     = "Customer name is required.";
  if (!v.customer_phone?.trim())  e.customer_phone    = "Customer phone is required.";
  else if (!/^\d{7,15}$/.test(v.customer_phone?.replace(/\s/g, "")))
    e.customer_phone = "Enter a valid phone number (7–15 digits).";
  if (!v.transaction_type)        e.transaction_type  = "Select a transaction type.";
  if (!v.amount || Number(v.amount) <= 0)
    e.amount = "Enter an amount greater than 0.";

  // CBSL limit enforcement
  const limit = CBSL_LIMITS[v.transaction_type];
  if (limit && Number(v.amount) > limit)
    e.amount = `CBSL limit for ${v.transaction_type.replaceAll("_", " ")} is ${formatCurrency(limit)}.`;

  return e;
}

export default function AgencyBankingForm({ initialData = {}, agencyId = null }) {
  const router = useRouter();
  const isEdit = !!agencyId;
  const [saving, setSaving]           = useState(false);
  const [serverError, setServerError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [values, setValues] = useState({
    customer_name:      initialData.customer_name      ?? "",
    customer_phone:     initialData.customer_phone     ?? "",
    transaction_type:   initialData.transaction_type   ?? "cash_deposit",
    amount:             initialData.amount             ?? "",
    agent_cash_balance: initialData.agent_cash_balance ?? "0",
    status:             initialData.status             ?? "completed",
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
      amount:             Number(values.amount),
      agent_cash_balance: Number(values.agent_cash_balance || 0),
    };
    try {
      if (isEdit) {
        await agencyBankingApi.update(agencyId, payload);
        router.push(`/dashboard/agency-banking/${agencyId}`);
      } else {
        await agencyBankingApi.create(payload);
        router.push("/dashboard/agency-banking");
      }
    } catch (err) {
      setServerError(err.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const cls = k =>
    `input-field ${fieldErrors[k] ? "border-red-400 ring-2 ring-red-100 focus:border-red-400 focus:ring-red-100" : ""}`;

  // Show applicable CBSL limit as a hint
  const cbslLimit = CBSL_LIMITS[values.transaction_type];
  const amountHint = cbslLimit
    ? `CBSL daily limit: ${formatCurrency(cbslLimit)}`
    : values.transaction_type === "balance_inquiry" ? "No monetary limit for balance inquiries." : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="card-elevated max-w-4xl space-y-6">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Customer Name" error={fieldErrors.customer_name} required>
          <input className={cls("customer_name")} value={values.customer_name}
            onChange={e => set("customer_name", e.target.value)}
            placeholder="e.g. Nimal Perera" />
        </FormField>

        <FormField label="Customer Phone" error={fieldErrors.customer_phone}
          hint="Must be 7–15 digits." required>
          <input className={cls("customer_phone")} value={values.customer_phone}
            onChange={e => set("customer_phone", e.target.value)}
            placeholder="0771234567" />
        </FormField>

        <FormField label="Transaction Type" error={fieldErrors.transaction_type} required>
          <select className={cls("transaction_type")} value={values.transaction_type}
            onChange={e => set("transaction_type", e.target.value)}>
            {AGENCY_TRANSACTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Amount (LKR)" error={fieldErrors.amount} hint={amountHint} required>
          <input className={cls("amount")} type="number" min="0.01" step="0.01"
            value={values.amount} onChange={e => set("amount", e.target.value)}
            placeholder="0.00" />
        </FormField>

        <FormField label="Agent Cash Balance (LKR)"
          hint="Your current cash float before this transaction.">
          <input className="input-field" type="number" min="0" step="0.01"
            value={values.agent_cash_balance}
            onChange={e => set("agent_cash_balance", e.target.value)} />
        </FormField>

        {isEdit && (
          <FormField label="Status">
            <select className="select-field" value={values.status}
              onChange={e => set("status", e.target.value)}>
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </FormField>
        )}
      </div>

      {!isEdit && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Service fee and commission are calculated automatically. All transactions are subject to CBSL daily limits.
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Link href="/dashboard/agency-banking">
          <Button variant="secondary" type="button">Cancel</Button>
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : (isEdit ? "Update Transaction" : "Create Transaction")}
        </Button>
      </div>
    </form>
  );
}
