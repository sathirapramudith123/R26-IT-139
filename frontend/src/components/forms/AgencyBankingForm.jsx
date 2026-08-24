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
import { User, Phone, DollarSign, AlertCircle, Loader2, Building2 } from "lucide-react";

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
    channel:          initialData.channel          ?? "pos_terminal", // ML Model එකට අවශ්‍යයි
    created_offline:  initialData.created_offline  ?? false,
    status:           initialData.status           ?? "completed",
  });

  function set(k, val) {
    setV(p => ({ ...p, [k]: val }));
    setErrors(p => ({ ...p, [k]: undefined }));
  }

  // ✅ Amount එක වෙනස් වන විට පමණක් Auto-Calculate වන ක්‍රමය
  function handleAmountChange(val) {
    const amt = Number(val);
    let fee = v.service_fee;
    let comm = v.commission;

    if (amt > 0 && !isEdit) {
      fee = Math.max(20, amt * 0.002).toFixed(2);
      comm = (amt * 0.005).toFixed(2);
    }

    setV(p => ({
      ...p,
      amount: val,
      service_fee: fee,
      commission: comm
    }));
    setErrors(p => ({ ...p, amount: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (!v.customer_name.trim()) er.customer_name = "Customer name is required.";
    if (!isValidPhone(v.customer_phone)) er.customer_phone = "Enter a valid Sri Lankan number.";
    if (!v.amount || Number(v.amount) <= 0) er.amount = "Enter an amount greater than 0.";

    const limit = CBSL_LIMITS[v.transaction_type];
    if (limit && Number(v.amount) > limit) er.amount = `CBSL limit is ${formatCurrency(limit)}.`;

    if (Object.keys(er).length) { setErrors(er); return; }

    setSaving(true);
    setServerError(null);

    const num = x => x === "" ? 0 : Number(x);
    const payload = {
      ...v,
      amount: Number(v.amount),
      service_fee: num(v.service_fee),
      commission: num(v.commission),
      tx_hour: new Date().getHours(), // ML Model (Anomaly Detection) එකට Real-time Hour එක ලබාදෙයි
    };

    try {
      if (isEdit) await agencyBankingApi.update(agencyId, payload);
      else await agencyBankingApi.create(payload);
      router.push("/dashboard/agency-banking");
    } catch (err) {
      setServerError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const getInputClass = k =>
    `w-full rounded-xl border bg-slate-950/50 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
      errors[k]
        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
        : "border-slate-800 focus:border-teal-500/50 focus:ring-teal-500/20"
    }`;

  const selectClass =
    "w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all";

  const limit = CBSL_LIMITS[v.transaction_type];

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 md:p-8 shadow-2xl space-y-6"
    >
      {serverError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Customer Name */}
        <FormField label="Customer Name" error={errors.customer_name} required>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={getInputClass("customer_name")}
              value={v.customer_name}
              onChange={e => set("customer_name", e.target.value)}
              placeholder="e.g. Nimal Perera"
            />
          </div>
        </FormField>

        {/* Customer Phone */}
        <FormField label="Customer Phone" error={errors.customer_phone} required>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={getInputClass("customer_phone")}
              value={v.customer_phone}
              onChange={e => set("customer_phone", e.target.value)}
              placeholder="0771234567"
            />
          </div>
        </FormField>

        {/* Transaction Type */}
        <FormField label="Transaction Type" required>
          <select
            className={selectClass}
            value={v.transaction_type}
            onChange={e => set("transaction_type", e.target.value)}
          >
            {AGENCY_TRANSACTION_TYPES.map(o => (
              <option key={o.value} value={o.value} className="bg-slate-900 text-slate-100">
                {o.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Amount */}
        <FormField
          label="Amount (LKR)"
          error={errors.amount}
          hint={limit ? `CBSL limit: ${formatCurrency(limit)}` : undefined}
          required
        >
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={getInputClass("amount")}
              type="number"
              min="0.01"
              step="0.01"
              value={v.amount}
              onChange={e => handleAmountChange(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </FormField>

        {/* Service Fee */}
        <FormField label="Service Fee (LKR)" hint="Charge for customer">
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={getInputClass("service_fee")}
              type="number"
              min="0"
              step="0.01"
              value={v.service_fee}
              onChange={e => set("service_fee", e.target.value)}
            />
          </div>
        </FormField>

        {/* Commission */}
        <FormField label="Commission (LKR)" hint="Bank agent payout">
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={getInputClass("commission")}
              type="number"
              min="0"
              step="0.01"
              value={v.commission}
              onChange={e => set("commission", e.target.value)}
            />
          </div>
        </FormField>

        {/* Status (Edit Mode Only) */}
        {isEdit && (
          <FormField label="Status">
            <select
              className={selectClass}
              value={v.status}
              onChange={e => set("status", e.target.value)}
            >
              {STATUSES.map(s => (
                <option key={s} value={s} className="bg-slate-900 text-slate-100">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </FormField>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-6">
        <Link href="/dashboard/agency-banking">
          <Button
            variant="secondary"
            type="button"
            className="rounded-xl border border-slate-800 bg-slate-950/50 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-all"
          >
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEdit ? (
            "Update Transaction"
          ) : (
            "Post Transaction"
          )}
        </Button>
      </div>
    </form>
  );
}