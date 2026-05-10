"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useJournal from "@/hooks/useJournal";

function money(v){ return v>0?`LKR ${Number(v).toLocaleString()}`:"—"; }

export default function JournalPage() {
  useAuthGuard();
  const { entries, trialBalance, accounts, loading, error, fetchAll } = useJournal();
  const [view,setView]=useState("journal");
  useEffect(()=>{ fetchAll(); },[fetchAll]);

  const TYPE_COLOR={"asset":"text-blue-600","revenue":"text-green-600","expense":"text-red-500"};

  const journalRows = [];
  entries.forEach(entry=>{
    (entry.lines??[]).forEach((line,idx)=>{
      journalRows.push({
        id:`${entry.id}-${idx}`,
        date: idx===0&&entry.created_at?new Date(entry.created_at).toLocaleDateString("en-LK"):"",
        description: idx===0?entry.description:"",
        account: <span><span className="mr-1 text-xs text-slate-400">{line.account_code}</span>{line.account_name}</span>,
        debit: line.entry_type==="debit"?<span className="font-semibold text-blue-600">{money(line.amount)}</span>:"—",
        credit: line.entry_type==="credit"?<span className="font-semibold text-emerald-600">{money(line.amount)}</span>:"—",
      });
    });
  });

  return (
    <div className="page-container">
      <PageHeader title="Journal & Trial Balance" description="Auto-generated double-entry records."
        action={<Link href="/dashboard/ledger"><Button variant="secondary">← Back to Ledger</Button></Link>} />
      <div className="mb-4 flex gap-2">
        {[["journal","Journal Entries"],["trial","Trial Balance"],["accounts","Account Balances"]].map(([v,l])=>(
          <Button key={v} variant={view===v?"primary":"secondary"} onClick={()=>setView(v)}>{l}</Button>
        ))}
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading?<LoadingSpinner label="Loading journal..."/>:(
        <>
          {view==="journal"&&(
            <Card>
              <h2 className="mb-4 font-outfit text-lg font-bold text-slate-900">Journal Entries <span className="text-sm font-normal text-slate-400">({entries.length} entries)</span></h2>
              {entries.length===0?<EmptyState icon="📒" title="No journal entries" description="Entries are created automatically with each transaction."/>:
               <Table columns={[{key:"date",label:"Date"},{key:"description",label:"Description"},{key:"account",label:"Account"},{key:"debit",label:"Debit (LKR)"},{key:"credit",label:"Credit (LKR)"}]} rows={journalRows}/>}
            </Card>
          )}
          {view==="trial"&&(
            <div className="space-y-4">
              {trialBalance&&(
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${trialBalance.balanced?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-red-200 bg-red-50 text-red-800"}`}>
                  {trialBalance.balanced?"✓ Ledger is balanced — total debits equal total credits.":"⚠ Ledger is out of balance — check for missing journal entries."}
                </div>
              )}
              <Card>
                <h2 className="mb-4 font-outfit text-lg font-bold text-slate-900">Trial Balance</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-400">
                      <th className="pb-3">Account Code</th><th className="pb-3">Account Name</th><th className="pb-3">Type</th>
                      <th className="pb-3 text-right">Debit (LKR)</th><th className="pb-3 text-right">Credit (LKR)</th><th className="pb-3 text-right">Balance (LKR)</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {trialBalance?.rows?.map(row=>(
                        <tr key={row.account_code}>
                          <td className="py-2.5 text-xs font-mono text-slate-500">{row.account_code}</td>
                          <td className="py-2.5 font-medium text-slate-700">{row.account_name}</td>
                          <td className={`py-2.5 capitalize text-xs ${TYPE_COLOR[row.account_type]||""}`}>{row.account_type}</td>
                          <td className="py-2.5 text-right text-slate-700">{row.debit_total>0?money(row.debit_total):"—"}</td>
                          <td className="py-2.5 text-right text-slate-700">{row.credit_total>0?money(row.credit_total):"—"}</td>
                          <td className={`py-2.5 text-right font-semibold ${TYPE_COLOR[row.account_type]||"text-slate-900"}`}>{money(row.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t-2 border-slate-300 bg-slate-50">
                      <td colSpan={3} className="py-3 text-sm font-bold text-slate-700">Totals</td>
                      <td className="py-3 text-right font-bold text-slate-900">{money(trialBalance?.total_debits)}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{money(trialBalance?.total_credits)}</td>
                      <td/>
                    </tr></tfoot>
                  </table>
                </div>
              </Card>
            </div>
          )}
          {view==="accounts"&&(
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(accounts).map(([code,acc])=>(
                <Card key={code}>
                  <p className="text-xs font-mono text-slate-400">{code}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 capitalize">{acc.type}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{acc.name}</p>
                  <p className={`mt-2 text-xl font-bold ${TYPE_COLOR[acc.type]||"text-slate-900"}`}>{money(acc.balance)}</p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
