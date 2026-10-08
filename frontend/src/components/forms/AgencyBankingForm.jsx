"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormField from "./FormField";
import Button from "@/components/ui/Button";
import { agencyBankingApi } from "@/services/api/agencyBanking";
import { agentBankApi } from "@/services/api/agentBank";
import { bankAccountApi } from "@/services/api/bankAccount";
import { AGENCY_TRANSACTION_TYPES } from "@/lib/constants";
import { isValidPhone } from "@/lib/validators";
import { formatCurrency } from "@/lib/formatters";
import {
  User,
  Phone,
  AlertCircle,
  Loader2,
  Landmark,
  CreditCard,
  ShieldCheck,
  Search,
  MessageSquare,
  KeyRound,
} from "lucide-react";

import { t } from "@/lib/i18n";
const STATUSES = ["completed", "pending", "failed"];

const DAILY_LIMITS = {
  cash_deposit: 50000,
  cash_withdrawal: 25000,
  fund_transfer: 50000,
};

const SOURCE_OF_FUNDS = [
  {
    value: "SALARY",
    get label() {
      return t("Salary");
    },
  },
  {
    value: "BUSINESS_INCOME",
    get label() {
      return t("Business Income");
    },
  },
  {
    value: "REMITTANCE",
    get label() {
      return t("Remittance");
    },
  },
  {
    value: "SAVINGS",
    get label() {
      return t("Savings");
    },
  },
  {
    value: "SALE_OF_PROPERTY",
    get label() {
      return t("Sale of Property");
    },
  },
  {
    value: "OTHER",
    get label() {
      return t("Other");
    },
  },
];

const HEALTH_COLORS = {
  HEALTHY: "text-emerald-600 dark:text-emerald-400",
  LOW_ALERT: "text-amber-600 dark:text-amber-400",
  CRITICAL_ALERT: "text-red-600 dark:text-red-400",
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

  // dummy bank: the customer's registered account, the withdrawal OTP and a balance inquiry
  const lockedToAccount = isEdit && !!initialData.bank_account_id;
  const [account, setAccount] = useState(null);
  const [lookup, setLookup] = useState({ loading: false, error: null });
  const [otp, setOtp] = useState(null); // { otp_id, expires_at, sent_to }
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const [v, setV] = useState({
    customer_name: initialData.customer_name ?? "",
    customer_phone: initialData.customer_phone ?? "",
    customer_nic: initialData.customer_nic ?? "",
    account_number: initialData.account_number ?? "", // NEW (mandatory)
    source_of_funds: initialData.source_of_funds ?? "", // NEW (mandatory)
    source_other: "", // free text when "OTHER"
    transaction_type: initialData.transaction_type ?? "cash_deposit",
    agent_bank_id: initialData.agent_bank_id ?? "",
    amount: initialData.amount ?? "",
    service_fee: initialData.service_fee ?? "",
    commission: initialData.commission ?? "",
    channel: initialData.channel ?? "pos_terminal",
    created_offline: initialData.created_offline ?? false,
    status: initialData.status ?? "completed",
  });

  useEffect(() => {
    agentBankApi
      .list()
      .then((d) => {
        // new shape: { cash_pool, banks }  (fallback: plain array)
        const arr = Array.isArray(d) ? d : d?.banks || [];
        setBanks(arr);
        setCashPool(Array.isArray(d) ? null : d?.cash_pool || null);
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
    setV((p) => ({ ...p, [k]: val }));
    setErrors((p) => ({ ...p, [k]: undefined }));
    // a different bank / account / type / amount needs a fresh lookup or OTP
    if (k === "agent_bank_id" || k === "account_number") {
      setAccount(null);
      setLookup({ loading: false, error: null });
    }
    if (["agent_bank_id", "account_number", "transaction_type", "amount"].includes(k)) {
      setOtp(null);
      setOtpCode("");
    }
  }

  // OTP countdown
  useEffect(() => {
    if (!otp) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [otp]);
  const otpLeft = otp ? Math.max(0, Math.round((new Date(otp.expires_at).getTime() - now) / 1000)) : 0;

  async function verifyAccount() {
    if (!v.agent_bank_id || !v.account_number.trim()) {
      setLookup({ loading: false, error: t("Select a bank and enter the account number.") });
      return;
    }
    setLookup({ loading: true, error: null });
    setNotice(null);
    try {
      const a = await bankAccountApi.lookup(v.agent_bank_id, v.account_number.trim());
      setAccount(a);
      setLookup({ loading: false, error: null });
      // the account holder's details come from the bank
      setV((p) => ({
        ...p,
        customer_name: a.holder_name,
        customer_phone: a.phone,
        customer_nic: a.holder_nic || "",
      }));
      setErrors((p) => ({
        ...p,
        account_number: undefined,
        customer_name: undefined,
        customer_phone: undefined,
      }));
    } catch (err) {
      setAccount(null);
      setLookup({ loading: false, error: err.message || t("Account not found.") });
    }
  }

  async function balanceInquiry() {
    if (!account) return;
    setNotice(null);
    try {
      const a = await bankAccountApi.balanceInquiry(account.id);
      setAccount(a);
      setNotice(`${t("Balance sent to the customer by SMS")} (${a.phone_masked}).`);
    } catch (err) {
      setNotice(err.message || t("Failed"));
    }
  }

  async function sendOtp() {
    if (!account || !(Number(v.amount) > 0)) return;
    setOtpBusy(true);
    setNotice(null);
    try {
      const o = await bankAccountApi.sendOtp(account.id, Number(v.amount));
      setOtp(o);
      setOtpCode("");
      setNow(Date.now());
      setNotice(`${t("OTP sent to the customer's phone")} ${o.sent_to}.`);
    } catch (err) {
      setErrors((p) => ({ ...p, amount: err.message || t("Could not send the OTP.") }));
    } finally {
      setOtpBusy(false);
    }
  }

  function handleAmountChange(val) {
    const amt = Number(val);
    let fee = v.service_fee;
    let comm = v.commission;
    if (amt > 0 && !isEdit) {
      fee = Math.max(20, amt * 0.002).toFixed(2);
      comm = (amt * 0.005).toFixed(2);
    }
    setV((p) => ({ ...p, amount: val, service_fee: fee, commission: comm }));
    setErrors((p) => ({ ...p, amount: undefined }));
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
      floatAfter = bal - amt; // float down
      cashAfter = cash + amt;
      if (floatAfter < 0)
        floatMsg = {
          type: "error",
          get text() {
            return t("Insufficient float to fund this deposit.");
          },
        };
      else if (floatAfter < Number(selectedBank.float_floor))
        floatMsg = {
          type: "warn",
          get text() {
            return t("Float will drop below floor — top-up recommended.");
          },
        };
    } else if (v.transaction_type === "cash_withdrawal") {
      floatAfter = bal + amt;
      cashAfter = cash - amt;
      if (cashAfter < 0)
        floatMsg = {
          type: "error",
          get text() {
            return t("Insufficient cash on hand to pay out this withdrawal.");
          },
        };
      else if (floatAfter > Number(selectedBank.float_ceiling))
        floatMsg = {
          type: "warn",
          get text() {
            return t("Float will exceed ceiling — schedule a sweep.");
          },
        };
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const er = {};
    if (!v.customer_name.trim()) er.customer_name = t("Customer name is required.");
    if (!isValidPhone(v.customer_phone)) er.customer_phone = t("Enter a valid Sri Lankan number.");
    if (!v.amount || Number(v.amount) <= 0) er.amount = t("Enter an amount greater than 0.");
    if (limit && Number(v.amount) > limit) {
      er.amount = `${t("Daily limit is")} ${formatCurrency(limit)}.`;
    }
    if (!v.account_number.trim()) er.account_number = t("Account number is required.");
    if (v.transaction_type === "cash_deposit") {
      if (!v.source_of_funds) er.source_of_funds = t("Source of funds is required for deposits.");
      if (v.source_of_funds === "OTHER" && !v.source_other.trim())
        er.source_other = t("Please specify the source of funds.");
    }

    if (floatMsg?.type === "error")
      er.amount = t("Insufficient float in the selected bank for this deposit.");

    // registered account rules (new deposits / withdrawals through a partner bank)
    const cashTxn = v.transaction_type === "cash_deposit" || v.transaction_type === "cash_withdrawal";
    if (!isEdit && cashTxn && v.agent_bank_id) {
      if (!account) er.account_number = t("Verify the customer's account first.");
      else if (v.transaction_type === "cash_withdrawal") {
        if (Number(v.amount) > account.balance)
          er.amount = `${t("Insufficient balance. Available:")} ${formatCurrency(account.balance)}.`;
        else if (!otp) er.otp = t("Send an OTP to the customer first.");
        else if (otpLeft <= 0) er.otp = t("The OTP has expired — send a new one.");
        else if (!/^[0-9]{6}$/.test(otpCode.trim()))
          er.otp = t("Enter the 6-digit OTP the customer received.");
      }
    }

    if (Object.keys(er).length) {
      setErrors(er);
      return;
    }

    setSaving(true);
    setServerError(null);

    const num = (x) => (x === "" ? 0 : Number(x));
    const payload = {
      ...v,
      source_of_funds:
        v.transaction_type === "cash_deposit"
          ? v.source_of_funds === "OTHER"
            ? v.source_other.trim()
            : v.source_of_funds
          : null,
      agent_bank_id: v.agent_bank_id || null,
      amount: Number(v.amount),
      service_fee: num(v.service_fee),
      commission: num(v.commission),
      tx_hour: new Date().getHours(),
      otp_id: otp?.otp_id || null,
      otp_code: otpCode.trim() || null,
    };

    try {
      if (isEdit) await agencyBankingApi.update(agencyId, payload);
      else await agencyBankingApi.create(payload);
      router.push("/dashboard/agency-banking");
    } catch (err) {
      setServerError(err.message || t("Save failed."));
    } finally {
      setSaving(false);
    }
  }

  const getInputClass = (k) =>
    `w-full rounded-xl border bg-white dark:bg-slate-950/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
      errors[k]
        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
        : "border-slate-300 dark:border-slate-800 focus:border-brand-500/50 focus:ring-brand-500/20"
    }`;

  const selectClass =
    "w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/50 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-xl p-6 md:p-8 shadow-2xl space-y-6"
    >
      {serverError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Bank selector + live float panel */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label={t("Agent Bank (Float Account)")}
            hint={
              banks.length === 0 && !loadingBanks
                ? t("Add a bank in 'My Banks' first")
                : t("Which float account funds this transaction")
            }
          >
            <div className="relative">
              <Landmark className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <select
                className={`${selectClass} pl-10`}
                value={v.agent_bank_id}
                onChange={(e) => set("agent_bank_id", e.target.value)}
              >
                <option value="" className="bg-white dark:bg-slate-900">
                  {loadingBanks ? t("Loading banks…") : t("— No bank (skip float) —")}
                </option>
                {banks.map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
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
                <span className="text-slate-500 dark:text-slate-400">{t("Current float")}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(selectedBank.float_balance)}
                </span>
              </div>
              {floatAfter !== null && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("Float after")} {v.transaction_type === "cash_deposit" ? "↓" : "↑"}
                  </span>
                  <span
                    className={`font-semibold ${floatAfter < Number(selectedBank.float_floor) ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}
                  >
                    {formatCurrency(floatAfter)}
                  </span>
                </div>
              )}
              <div className="my-2 border-t border-slate-300/60 dark:border-slate-700/60" />
              {/* Cash on hand (shared global pool) */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t("Cash on hand (pool)")}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {cashPool ? formatCurrency(cashPool.cash_on_hand) : "—"}
                </span>
              </div>
              {cashAfter !== null && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("Cash after")} {v.transaction_type === "cash_deposit" ? "↑" : "↓"}
                  </span>
                  <span
                    className={`font-semibold ${cashAfter < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
                  >
                    {formatCurrency(cashAfter)}
                  </span>
                </div>
              )}
              <div className="my-2 border-t border-slate-300/60 dark:border-slate-700/60" />
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t("Health")}</span>
                <span
                  className={`font-semibold ${HEALTH_COLORS[selectedBank.float_health] || "text-slate-600 dark:text-slate-300"}`}
                >
                  {t((selectedBank.float_health || "—").replace("_", " "))}
                </span>
              </div>
              {floatMsg && (
                <p
                  className={`mt-2 text-xs ${floatMsg.type === "error" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
                >
                  {floatMsg.text}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField label={t("Customer Name")} error={errors.customer_name} required>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              className={getInputClass("customer_name")}
              value={v.customer_name}
              onChange={(e) => set("customer_name", e.target.value)}
              placeholder={t("e.g. Nimal Perera")}
            />
          </div>
        </FormField>

        <FormField label={t("Customer Phone")} error={errors.customer_phone} required>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              className={getInputClass("customer_phone")}
              value={v.customer_phone}
              onChange={(e) => set("customer_phone", e.target.value)}
              placeholder="0771234567"
            />
          </div>
        </FormField>

        {/* NEW: Customer NIC */}
        <FormField label={t("Customer NIC")} hint={t("Used for daily transaction-count limits (max 5/day)")}>
          <div className="relative">
            <CreditCard className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              className={getInputClass("customer_nic")}
              value={v.customer_nic}
              onChange={(e) => set("customer_nic", e.target.value)}
              placeholder={t("e.g. 199012345678")}
            />
          </div>
        </FormField>

        <FormField label={t("Transaction Type")} required>
          <select
            className={selectClass}
            value={v.transaction_type}
            onChange={(e) => set("transaction_type", e.target.value)}
          >
            {AGENCY_TRANSACTION_TYPES.filter((o) => o.value !== "fund_transfer").map((o) => (
              <option
                key={o.value}
                value={o.value}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {o.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("Account Number")}
          error={errors.account_number || lookup.error}
          hint={v.agent_bank_id ? t("Registered account at the selected bank") : undefined}
          required
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <CreditCard className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                className={getInputClass("account_number")}
                value={v.account_number}
                onChange={(e) => set("account_number", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    verifyAccount();
                  }
                }}
                placeholder={t("e.g. 8001234567")}
                disabled={lockedToAccount}
              />
            </div>
            {!lockedToAccount && v.agent_bank_id && (
              <button
                type="button"
                onClick={verifyAccount}
                disabled={lookup.loading}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-60 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-300"
              >
                {lookup.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {t("Verify")}
              </button>
            )}
          </div>
        </FormField>

        {/* the customer's account at the dummy bank */}
        {account && (
          <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" /> {t("Account verified")} · {account.bank_name}
                </p>
                <p className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  {account.holder_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A/C {account.account_number} · {account.phone_masked}
                  {account.has_email ? ` · ${t("e-mail on file")}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("Available balance")}</p>
                <p className="font-display text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(account.balance)}
                </p>
                {Number(v.amount) > 0 &&
                  (v.transaction_type === "cash_deposit" || v.transaction_type === "cash_withdrawal") && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("After this transaction:")}{" "}
                      <b
                        className={
                          v.transaction_type === "cash_withdrawal" && Number(v.amount) > account.balance
                            ? "text-red-600"
                            : ""
                        }
                      >
                        {formatCurrency(
                          v.transaction_type === "cash_deposit"
                            ? account.balance + Number(v.amount)
                            : account.balance - Number(v.amount),
                        )}
                      </b>
                    </p>
                  )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={balanceInquiry}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <MessageSquare className="h-3.5 w-3.5" /> {t("Balance inquiry (SMS to customer)")}
              </button>
              {notice && <span className="text-xs text-emerald-700 dark:text-emerald-400">{notice}</span>}
            </div>

            {/* withdrawal: OTP to the customer's phone */}
            {v.transaction_type === "cash_withdrawal" && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
                  <KeyRound className="h-4 w-4" /> {t("Customer OTP required for withdrawals")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={otpBusy || !(Number(v.amount) > 0) || Number(v.amount) > account.balance}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                  >
                    {otpBusy ? t("Sending…") : otp ? t("Resend OTP") : t("Send OTP")}
                  </button>
                  {otp && (
                    <>
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value.replace(/[^0-9]/g, ""));
                          setErrors((p) => ({ ...p, otp: undefined }));
                        }}
                        placeholder="••••••"
                        className="w-32 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-center font-mono text-lg tracking-[0.3em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-amber-800 dark:bg-slate-950 dark:text-slate-100"
                      />
                      <span className={`text-xs ${otpLeft > 0 ? "text-slate-500" : "text-red-600"}`}>
                        {otpLeft > 0
                          ? `${t("Expires in")} ${Math.floor(otpLeft / 60)}:${String(otpLeft % 60).padStart(2, "0")}`
                          : t("Expired")}
                      </span>
                    </>
                  )}
                </div>
                {!(Number(v.amount) > 0) && (
                  <p className="mt-1 text-xs text-slate-500">{t("Enter the amount first.")}</p>
                )}
                {errors.otp && <p className="mt-1 text-xs font-medium text-red-600">{errors.otp}</p>}
              </div>
            )}
          </div>
        )}

        {lockedToAccount && (
          <p className="md:col-span-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {t(
              "Posted to the customer's account — amount, type, account and bank cannot be changed. Delete the transaction to reverse it.",
            )}
          </p>
        )}

        {v.transaction_type === "cash_deposit" && (
          <FormField
            label={t("Source of Funds")}
            error={errors.source_of_funds}
            required
            hint={t("Required for deposits (AML record)")}
          >
            <select
              className={selectClass}
              value={v.source_of_funds}
              onChange={(e) => set("source_of_funds", e.target.value)}
            >
              <option value="" className="bg-white dark:bg-slate-900">
                {t("— Select source —")}
              </option>
              {SOURCE_OF_FUNDS.map((o) => (
                <option
                  key={o.value}
                  value={o.value}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {v.transaction_type === "cash_deposit" && v.source_of_funds === "OTHER" && (
          <FormField label={t("Specify Source of Funds")} error={errors.source_other} required>
            <input
              className={getInputClass("source_other")}
              value={v.source_other}
              onChange={(e) => set("source_other", e.target.value)}
              placeholder={t("Describe the source of funds")}
            />
          </FormField>
        )}

        <FormField
          label={t("Amount (LKR)")}
          error={errors.amount}
          hint={limit ? `${t("Daily limit:")} ${formatCurrency(limit)}` : undefined}
          required
        >
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 select-none">
              {t("Rs.")}
            </span>
            <input
              className={getInputClass("amount")}
              type="number"
              min="0.01"
              step="0.01"
              value={v.amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </FormField>

        <FormField label={t("Service Fee (LKR)")} hint="">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 select-none">
              {t("Rs.")}
            </span>
            <input
              className={getInputClass("service_fee")}
              type="number"
              min="0"
              step="0.01"
              value={v.service_fee}
              onChange={(e) => set("service_fee", e.target.value)}
              placeholder="0.00"
            />
          </div>
        </FormField>

        <FormField label={t("Commission (LKR)")} hint={t("Bank agent payout")}>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 select-none">
              {t("Rs.")}
            </span>
            <input
              className={getInputClass("commission")}
              type="number"
              min="0"
              step="0.01"
              value={v.commission}
              onChange={(e) => set("commission", e.target.value)}
              placeholder="0.00"
            />
          </div>
        </FormField>

        {isEdit && (
          <FormField label={t("Status")}>
            <select className={selectClass} value={v.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => (
                <option
                  key={s}
                  value={s}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {t(s.charAt(0).toUpperCase() + s.slice(1))}
                </option>
              ))}
            </select>
          </FormField>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800/80 pt-6">
        <Link href="/dashboard/agency-banking">
          <Button
            variant="secondary"
            type="button"
            className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/50 px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
          >
            {t("Cancel")}
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("Saving...")}
            </>
          ) : isEdit ? (
            t("Update Transaction")
          ) : (
            t("Post Transaction")
          )}
        </Button>
      </div>
    </form>
  );
}
