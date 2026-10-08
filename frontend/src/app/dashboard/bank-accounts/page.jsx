"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Landmark, Loader2, MessageSquare, ScrollText, Smartphone, RefreshCw, Mail } from "lucide-react";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import { bankAccountApi } from "@/services/api/bankAccount";
import { formatCurrency } from "@/lib/formatters";
import { t } from "@/lib/i18n";

// how often the page re-reads balances / messages (the "real-time" view)
const POLL_MS = 4000;

const fmtTime = (v) =>
  new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const KIND_STYLE = {
  OTP: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  CREDIT: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
  DEBIT: "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40",
  BALANCE: "border-brand-200 bg-brand-50 dark:border-brand-900 dark:bg-brand-950/40",
  REVERSAL: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800",
};

export default function BankAccountsPage() {
  useAuthGuard();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("phone");
  const [entries, setEntries] = useState([]);
  const [messages, setMessages] = useState([]);

  const loadAccounts = useCallback(async () => {
    try {
      const list = await bankAccountApi.list();
      setAccounts(list);
      setError(null);
      setSelected((cur) => cur ?? list[0]?.id ?? null);
    } catch (e) {
      setError(e.message || t("Failed"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      const [st, msgs] = await Promise.all([bankAccountApi.statement(id), bankAccountApi.messages(id)]);
      setEntries(st.entries || []);
      setMessages(msgs || []);
    } catch {
      /* keep the last view */
    }
  }, []);

  // first load + polling, so deposits / withdrawals posted elsewhere show up here
  useEffect(() => {
    loadAccounts();
    const id = setInterval(loadAccounts, POLL_MS);
    return () => clearInterval(id);
  }, [loadAccounts]);
  useEffect(() => {
    loadDetail(selected);
    const id = setInterval(() => loadDetail(selected), POLL_MS);
    return () => clearInterval(id);
  }, [selected, loadDetail]);

  const acc = accounts.find((a) => a.id === selected);
  const banks = [...new Set(accounts.map((a) => a.bank_name))];

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={t("Bank Accounts")}
        description={t(
          "Simulated partner-bank accounts — balances update live with every deposit and withdrawal.",
        )}
        action={
          <Link href="/dashboard/agency-banking/create" className="btn-primary">
            {t("+ New Transaction")}
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="card text-sm text-red-600">{error}</div>
      ) : accounts.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          {t(
            "No accounts yet. Add a partner bank in 'My Banks' — demo accounts are created for it automatically.",
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          {/* accounts */}
          <div className="space-y-5">
            {banks.map((bank) => (
              <div key={bank} className="card !p-0 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                  <Landmark className="h-4 w-4 text-brand-600" />
                  <p className="font-display font-semibold text-slate-800 dark:text-slate-100">{bank}</p>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {accounts
                    .filter((a) => a.bank_name === bank)
                    .map((a) => (
                      <li key={a.id}>
                        <button
                          onClick={() => setSelected(a.id)}
                          className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition ${
                            a.id === selected
                              ? "bg-brand-50 dark:bg-brand-950/40"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                              {a.holder_name}
                            </p>
                            <p className="font-mono text-xs text-slate-500">
                              {a.account_number} · {a.phone_masked}
                            </p>
                          </div>
                          <p className="shrink-0 font-display font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(a.balance)}
                          </p>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <RefreshCw className="h-3 w-3" /> {t("Updates automatically every few seconds.")}
            </p>
          </div>

          {/* selected account */}
          {acc && (
            <div className="space-y-4">
              <div className="gradient-brand rounded-2xl p-5 text-white shadow-lg">
                <p className="text-xs uppercase tracking-widest text-white/70">{acc.bank_name}</p>
                <p className="mt-1 font-display text-xl font-bold">{acc.holder_name}</p>
                <p className="font-mono text-sm text-white/80">A/C {acc.account_number}</p>
                <p className="mt-4 text-xs text-white/70">{t("Available balance")}</p>
                <p className="font-display text-3xl font-bold">{formatCurrency(acc.balance)}</p>
                <p className="mt-1 text-[11px] text-white/60">
                  NIC {acc.holder_nic || "—"} · {acc.phone}
                </p>
              </div>

              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {[
                  ["phone", Smartphone, t("Customer phone")],
                  ["statement", ScrollText, t("Statement")],
                ].map(([key, Icon, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      tab === key
                        ? "bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-400"
                        : "text-slate-500"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>

              {tab === "phone" ? (
                // the customer's phone: simulated SMS inbox (OTPs, credit / debit alerts)
                <div className="mx-auto max-w-sm rounded-[2rem] border-8 border-slate-900 bg-slate-100 shadow-xl dark:border-slate-700 dark:bg-slate-950">
                  <div className="flex items-center gap-2 rounded-t-[1.4rem] bg-slate-900 px-4 py-2 text-white">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-semibold">{acc.bank_name}</span>
                    <span className="ml-auto text-[11px] text-white/60">{acc.phone}</span>
                  </div>
                  <div className="max-h-[440px] min-h-[300px] space-y-2 overflow-y-auto p-3">
                    {messages.length === 0 ? (
                      <p className="py-16 text-center text-xs text-slate-400">{t("No messages yet.")}</p>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m.message_id}
                          className={`rounded-2xl rounded-tl-sm border px-3 py-2 text-[13px] leading-snug text-slate-800 dark:text-slate-100 ${KIND_STYLE[m.kind] || KIND_STYLE.REVERSAL}`}
                        >
                          {m.channel === "EMAIL" && (
                            <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500">
                              <Mail className="h-3 w-3" /> e-mail · {m.delivery.toLowerCase()}
                            </p>
                          )}
                          {m.body}
                          <p className="mt-1 text-right text-[10px] text-slate-400">
                            {fmtTime(m.created_at)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="card !p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <th className="px-4 py-2.5 font-medium">{t("Date")}</th>
                        <th className="px-4 py-2.5 font-medium">{t("Description")}</th>
                        <th className="px-4 py-2.5 text-right font-medium">{t("Amount")}</th>
                        <th className="px-4 py-2.5 text-right font-medium">{t("Balance")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-2.5 text-xs text-slate-500">{fmtTime(e.created_at)}</td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              {t(
                                e.entry_type
                                  .replace(/_/g, " ")
                                  .toLowerCase()
                                  .replace(/^./, (c) => c.toUpperCase()),
                              )}
                            </p>
                            <p className="text-xs text-slate-400">{e.note}</p>
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-semibold ${Number(e.amount) >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {Number(e.amount) >= 0 ? "+" : "−"} {formatCurrency(Math.abs(Number(e.amount)))}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {formatCurrency(e.balance_after)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
