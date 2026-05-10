"use client";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { ledgerApi } from "@/services/api/ledger.api";

function money(v) { return `LKR ${Number(v || 0).toLocaleString()}`; }

export default function LedgerReportsPage() {
  useAuthGuard();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [exporting,  setExporting]  = useState(false);
  const [exportError,setExportError]= useState("");

  useEffect(() => {
    ledgerApi.reports()
      .then(setData)
      .catch(e => setError(e.message || "Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExporting(true);
    setExportError("");
    try {
      await ledgerApi.exportPdf();
    } catch (e) {
      setExportError(e.message || "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Financial Reports"
        description="Monthly breakdown, category analysis, and payment insights."
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? "Generating PDF…" : "⬇ Export PDF"}
            </Button>
            <Link href="/dashboard/ledger">
              <Button variant="secondary">← Back</Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {exportError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          PDF export failed: {exportError}
        </div>
      )}

      {loading ? <LoadingSpinner label="Loading reports..." /> : !data ? null : (
        <div className="space-y-6">
          <Card>
            <p className="text-sm text-slate-500">Total Transactions Analysed</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{data.total_transactions}</p>
          </Card>

          <Card>
            <h2 className="mb-4 font-outfit text-lg font-bold text-slate-900">Monthly Breakdown</h2>
            {data.monthly.length === 0 ? (
              <p className="text-sm text-slate-400">No monthly data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                      <th className="pb-2 font-medium">Month</th>
                      <th className="pb-2 font-medium">Income</th>
                      <th className="pb-2 font-medium">Expense</th>
                      <th className="pb-2 font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.monthly.map(row => {
                      const net = (row.income || 0) - (row.expense || 0);
                      return (
                        <tr key={row.month}>
                          <td className="py-2 font-medium text-slate-700">{row.month}</td>
                          <td className="py-2 text-green-600">{money(row.income)}</td>
                          <td className="py-2 text-red-500">{money(row.expense)}</td>
                          <td className={`py-2 font-semibold ${net >= 0 ? "text-blue-600" : "text-red-600"}`}>
                            {money(net)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-outfit text-lg font-bold text-slate-900">By Category</h2>
              <div className="space-y-2">
                {Object.entries(data.by_category || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm capitalize text-slate-600">{k.replaceAll("_", " ")}</span>
                    <span className="text-sm font-semibold text-slate-900">{money(v)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="mb-4 font-outfit text-lg font-bold text-slate-900">By Payment Method</h2>
              <div className="space-y-2">
                {Object.entries(data.by_payment || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm capitalize text-slate-600">{k.replaceAll("_", " ")}</span>
                    <span className="text-sm font-semibold text-slate-900">{money(v)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
