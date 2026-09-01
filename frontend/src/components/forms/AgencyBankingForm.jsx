"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { agencyBankingApi } from "@/services/api/agencyBanking";
import { agentBankApi } from "@/services/api/agentBank";
import { AGENCY_TRANSACTION_TYPES } from "@/lib/constants";
import { isValidPhone } from "@/lib/validators";
import { formatCurrency } from "@/lib/formatters";
import { User, Phone, AlertCircle, Loader2, Landmark, CreditCard } from "lucide-react";

const STATUSES = ["completed", "pending", "failed"];

const DAILY_LIMITS = {
  cash_deposit: 50000, cash_withdrawal: 25000, fund_transfer: 50000,
};

const SOURCE_OF_FUNDS = [
  { value: "SALARY",           label: "Salary" },
  { value: "BUSINESS_INCOME",  label: "Business Income" },
  { value: "REMITTANCE",       label: "Remittance" },
  { value: "SAVINGS",          label: "Savings" },
  { value: "SALE_OF_PROPERTY", label: "Sale of Property" },
  { value: "OTHER",            label: "Other" },
];

const HEALTH_COLORS = {
  HEALTHY:         "text-emerald-600 dark:text-emerald-400",
  LOW_ALERT:       "text-amber-600 dark:text-amber-400",
  CRITICAL_ALERT:  "text-red-600 dark:text-red-400",
};

export default function AgencyBankingForm({ initialData = {}, agencyId = null }) {
  const router = useRouter();
  const isEdit = !!agencyId;
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});

  const [banks, setBanks] = useState([]);
  const [cashPool, setCashPool] = useState(null);
  const [loadingBanks, setLoadingBanks] = useState(true);

  const [v, setV] = useState({
    customer_name:    initialData.customer_name    ?? "",
    customer_phone:   initialData.customer_phone   ?? "",
    customer_nic:     initialData.customer_nic     ?? "",
    account_number:   initialData.account_number   ?? "",   // NEW (mandatory)
    source_of_funds:  initialData.source_of_funds  ?? "",   // NEW (mandatory)
    source_other:     "",                                    // free text when "OTHER"
    transaction_type: initialData.transaction_type ?? "cash_deposit",
    agent_bank_id:    initialData.agent_bank_id    ?? "",
    amount:           initialData.amount           ?? "",
    service_fee:      initialData.service_fee      ?? "",
    commission:       initialData.commission       ?? "",
    channel:          initialData.channel          ?? "pos_terminal",
    created_offline:  initialData.created_offline  ?? false,
    status:           initialData.status           ?? "completed",
  });

  
  useEffect(() => {
    agentBankApi.list()
      .then((d) => {
        // new shape: { cash_pool, banks }  (fallback: plain array)
        const arr = Array.isArray(d) ? d : (d?.banks || []);
        setBanks(arr);
        setCashPool(Array.isArray(d) ? null : (d?.cash_pool || null));
        // auto-select first bank if none chosen
        if (!v.agent_bank_id && arr.length > 0) {
          setV((p) => ({ ...p, agent_bank_id: arr[0].id }));
        }
      })
      .catch(() => setBanks([]))
      .finally(() => setLoadingBanks(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(k, val) {
    setV(p => ({ ...p, [k]: val }));
    setErrors(p => ({ ...p, [k]: undefined }));
  }

  function handleAmountChange(val) {
    const amt = Number(val);
    let fee = v.service_fee;
    let comm = v.commission;
    if (amt > 0 && !isEdit) {
      fee = Math.max(20, amt * 0.002).toFixed(2);
      comm = (amt * 0.005).toFixed(2);
    }
    setV(p => ({ ...p, amount: val, service_fee: fee, commission: comm }));
    setErrors(p => ({ ...p, amount: undefined }));
  }

  const limit = DAILY_LIMITS[v.transaction_type];
  const selectedBank = banks.find((b) => b.id === v.agent_bank_id);

  // Live preview — deposit: float DOWN, cash UP | withdrawal: float UP, cash DOWN
  let floatAfter = null;
  let cashAfter = null;
  let floatMsg = null;
  if (selectedBank && Number(v.amount) > 0) {
    const bal = Number(selectedBank.float_balance);
    const cash = cashPool ? Number(cashPool.cash_on_hand) : 0;
    const amt = Number(v.amount);
    if (v.transaction_type === "cash_deposit") {
      floatAfter = bal - amt;         // float down
      cashAfter = cash + amt;        
      if (floatAfter < 0) floatMsg = { type: "error", text: "Insufficient float to fund this deposit." };
      else if (floatAfter < Number(selectedBank.float_floor)) floatMsg = { type: "warn", text: "Float will drop below floor — top-up recommended." };
    } else if (v.transaction_type === "cash_withdrawal") {
      floatAfter = bal + amt;         
      cashAfter = cash - amt;        
      if (cashAfter < 0) floatMsg = { type: "error", text: "Insufficient cash on hand to pay out this withdrawal." };
      else if (floatAfter > Number(selectedBank.float_ceiling)) floatMsg = { type: "warn", text: "Float will exceed ceiling — schedule a sweep." };
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (!v.customer_name.trim()) er.customer_name = "Customer name is required.";
    if (!isValidPhone(v.customer_phone)) er.customer_phone = "Enter a valid Sri Lankan number.";
    if (!v.amount || Number(v.amount) <= 0) er.amount = "Enter an amount greater than 0.";
    if (limit && Number(v.amount) > limit) {
      er.amount = `Daily limit is ${formatCurrency(limit)}.`;
    }
    if (!v.account_number.trim()) er.account_number = "Account number is required.";
    if (v.transaction_type === "cash_deposit") {
      if (!v.source_of_funds) er.source_of_funds = "Source of funds is required for deposits.";
      if (v.source_of_funds === "OTHER" && !v.source_other.trim()) er.source_other = "Please specify the source of funds.";
    }
    
    if (floatMsg?.type === "error") er.amount = "Insufficient float in the selected bank for this deposit.";

    if (Object.keys(er).length) { setErrors(er); return; }

    setSaving(true);
    setServerError(null);

    const num = x => x === "" ? 0 : Number(x);
    const payload = {
      ...v,
      source_of_funds: v.transaction_type === "cash_deposit"
        ? (v.source_of_funds === "OTHER" ? v.source_other.trim() : v.source_of_funds)
        : null,
      agent_bank_id: v.agent_bank_id || null,
      amount: Number(v.amount),
      service_fee: num(v.service_fee),
      commission: num(v.commission),
      tx_hour: new Date().getHours(),
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
    `w-full rounded-xl border bg-white dark:bg-slate-950/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
      errors[k]
        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
        : "border-slate-300 dark:border-slate-800 focus:border-teal-500/50 focus:ring-teal-500/20"
    }`;

  const selectClass =
    "w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all";

  return (
    <form onSubmit={handleSubmit} noValidate
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-xl p-6 md:p-8 shadow-2xl space-y-6">
      {serverError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Bank selector + live float panel */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Agent Bank (Float Account)"
            hint={banks.length === 0 && !loadingBanks ? "Add a bank in 'My Banks' first" : "Which float account funds this transaction"}>
            <div className="relative">
              <Landmark className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <select className={`${selectClass} pl-10`} value={v.agent_bank_id}
                onChange={e => set("agent_bank_id", e.target.value)}>
                <option value="" className="bg-white dark:bg-slate-900">
                  {loadingBanks ? "Loading banks…" : "— No bank (skip float) —"}
                </option>
                {banks.map(b => (
                  <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {b.bank_name} — {formatCurrency(b.float_balance)}
                  </option>
                ))}
              </select>
            </div>
          </FormField>

          {selectedBank && (
            <div className="flex flex-col justify-center rounded-xl bg-slate-100 dark:bg-slate-900/60 px-4 py-3 text-sm">
              {/* Float */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Current float</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(selectedBank.float_balance)}</span>
              </div>
              {floatAfter !== null && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Float after {v.transaction_type === "cash_deposit" ? "↓" : "↑"}</span>
                  <span className={`font-semibold ${floatAfter < Number(selectedBank.float_floor) ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {formatCurrency(floatAfter)}
                  </span>
                </div>
              )}
              <div className="my-2 border-t border-slate-300/60 dark:border-slate-700/60" />
              {/* Cash on hand (shared global pool) */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Cash on hand (pool)</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{cashPool ? formatCurrency(cashPool.cash_on_hand) : "—"}</span>
              </div>
              {cashAfter !== null && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Cash after {v.transaction_type === "cash_deposit" ? "↑" : "↓"}</span>
                  <span className={`font-semibold ${cashAfter < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {formatCurrency(cashAfter)}
                  </span>
                </div>
              )}
              <div className="my-2 border-t border-slate-300/60 dark:border-slate-700/60" />
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Health</span>
                <span className={`font-semibold ${HEALTH_COLORS[selectedBank.float_health] || "text-slate-600 dark:text-slate-300"}`}>
                  {(selectedBank.float_health || "—").replace("_", " ")}
                </span>
              </div>
              {floatMsg && (
                <p className={`mt-2 text-xs ${floatMsg.type === "error" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {floatMsg.text}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField label="Customer Name" error={errors.customer_name} required>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input className={getInputClass("customer_name")} value={v.customer_name}
              onChange={e => set("customer_name", e.target.value)} placeholder="e.g. Nimal Perera" />
          </div>
        </FormField>

        <FormField label="Customer Phone" error={errors.customer_phone} required>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input className={getInputClass("customer_phone")} value={v.customer_phone}
              onChange={e => set("customer_phone", e.target.value)} placeholder="0771234567" />
          </div>
        </FormField>

        {/* NEW: Customer NIC */}
        <FormField label="Customer NIC" hint="Used for daily transaction-count limits (max 5/day)">
          <div className="relative">
            <CreditCard className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input className={getInputClass("customer_nic")} value={v.customer_nic}
              onChange={e => set("customer_nic", e.target.value)} placeholder="e.g. 199012345678" />
          </div>
        </FormField>

        <FormField label="Transaction Type" required>
          <select className={selectClass} value={v.transaction_type}
            onChange={e => set("transaction_type", e.target.value)}>
            {AGENCY_TRANSACTION_TYPES.filter(o => o.value !== "fund_transfer").map(o => (
              <option key={o.value} value={o.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{o.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Account Number" error={errors.account_number} required>
          <div className="relative">
            <CreditCard className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input className={getInputClass("account_number")} value={v.account_number}
              onChange={e => set("account_number", e.target.value)} placeholder="e.g. 8001234567" />
          </div>
        </FormField>

        {v.transaction_type === "cash_deposit" && (
          <FormField label="Source of Funds" error={errors.source_of_funds} required
            hint="Required for deposits (AML record)">
            <select className={selectClass} value={v.source_of_funds}
              onChange={e => set("source_of_funds", e.target.value)}>
              <option value="" className="bg-white dark:bg-slate-900">— Select source —</option>
              {SOURCE_OF_FUNDS.map(o => (
                <option key={o.value} value={o.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{o.label}</option>
              ))}
            </select>
          </FormField>
        )}

        {v.transaction_type === "cash_deposit" && v.source_of_funds === "OTHER" && (
          <FormField label="Specify Source of Funds" error={errors.source_other} required>
            <input className={getInputClass("source_other")} value={v.source_other}
              onChange={e => set("source_other", e.target.value)} placeholder="Describe the source of funds" />
          </FormField>
        )}

        <FormField label="Amount (LKR)" error={errors.amount}
          hint={limit ? `Daily limit: ${formatCurrency(limit)}` : undefined}
          required>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 select-none">Rs.</span>
            <input className={getInputClass("amount")} type="number" min="0.01" step="0.01"
              value={v.amount} onChange={e => handleAmountChange(e.target.value)} placeholder="0.00" />
          </div>
        </FormField>

        <FormField label="Service Fee (LKR)" hint="Charge for customer">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 select-none">Rs.</span>
            <input className={getInputClass("service_fee")} type="number" min="0" step="0.01"
              value={v.service_fee} onChange={e => set("service_fee", e.target.value)} placeholder="0.00" />
          </div>
        </FormField>

        <FormField label="Commission (LKR)" hint="Bank agent payout">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 select-none">Rs.</span>
            <input className={getInputClass("commission")} type="number" min="0" step="0.01"
              value={v.commission} onChange={e => set("commission", e.target.value)} placeholder="0.00" />
          </div>
        </FormField>

        {isEdit && (
          <FormField label="Status">
            <select className={selectClass} value={v.status} onChange={e => set("status", e.target.value)}>
              {STATUSES.map(s => (
                <option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </FormField>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800/80 pt-6">
        <Link href="/dashboard/agency-banking">
          <Button variant="secondary" type="button"
            className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/50 px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-all">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 transition-all disabled:opacity-50">
          {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>)
            : isEdit ? "Update Transaction" : "Post Transaction"}
        </Button>
      </div>
    </form>
  );
}