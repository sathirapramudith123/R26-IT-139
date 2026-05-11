"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import useAuthGuard from "@/hooks/useAuthGuard";
import { ROLES } from "@/lib/constants/index";
import { apiClient } from "@/services/api/client";
import { tokenService } from "@/services/auth/tokenService";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function PriceDataPage() {
  useAuthGuard(ROLES.ADMIN);
  const fileRef = useRef(null);
  const [uploading,   setUploading]   = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState("");
  const [dates,       setDates]       = useState([]);
  const [latest,      setLatest]      = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get("/price-data/dates"),
      apiClient.get("/price-data/latest"),
    ])
      .then(([d, l]) => {
        setDates(Array.isArray(d) ? d : []);
        setLatest(Array.isArray(l?.records) ? l.records : []);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file)                        { setError("Please select a PDF file."); return; }
    if (!file.name.endsWith(".pdf"))  { setError("Only PDF files accepted.");  return; }
    setUploading(true); setError(""); setResult(null);
    try {
      const token = tokenService.getToken();
      const form  = new FormData();
      form.append("file", file);
      const res  = await fetch(`${BASE}/price-data/upload`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setResult(data);
      const d = await apiClient.get("/price-data/dates");
      setDates(Array.isArray(d) ? d : []);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownloadCsv() {
    const token = tokenService.getToken();
    const res   = await fetch(`${BASE}/price-data/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { alert("No data to export."); return; }
    const blob = await res.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `hkarti_prices_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Market Price Data"
        description="Upload the daily HKARTI wholesale price PDF. Procurement DSS uses this to benchmark supplier prices."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDownloadCsv}>⬇ Export CSV</Button>
            <Link href="/dashboard/admin/users"><Button variant="secondary">← Admin</Button></Link>
          </div>
        }
      />

      <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-4 text-sm text-teal-800 mb-6">
        <p className="font-semibold mb-1">How this works</p>
        <p className="text-xs text-teal-700 leading-relaxed">
          Download the daily price bulletin from the Hector Kobbekaduwa Agrarian Research and
          Training Institute. Upload it here. The system extracts all price data automatically.
          When a merchant runs a procurement recommendation, supplier prices are compared against
          the real government wholesale average — not just against each other.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-outfit text-base font-semibold text-slate-900">Upload Price PDF</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-teal-300 transition-colors">
              <div className="text-3xl mb-2">📄</div>
              <p className="text-sm text-slate-600 mb-3">Select the HKARTI daily price bulletin PDF</p>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" id="pdf-upload" />
              <label htmlFor="pdf-upload"
                className="cursor-pointer rounded-lg bg-teal-50 border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 transition">
                Choose PDF File
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? "Parsing PDF..." : "Upload & Parse"}
            </Button>
          </form>

          {result && (
            <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4">
              <p className="text-sm font-semibold text-teal-800 mb-2">✓ {result.message}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-teal-700 mb-3">
                <div>Report date: <strong>{result.report_date}</strong></div>
                <div>Records saved: <strong>{result.saved}</strong></div>
              </div>
              <p className="text-xs font-medium text-teal-700 mb-2">Preview:</p>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-teal-200">
                    <th className="text-left py-1 font-medium text-teal-600">Item</th>
                    <th className="text-left py-1 font-medium text-teal-600">Market</th>
                    <th className="text-right py-1 font-medium text-teal-600">Avg LKR</th>
                  </tr></thead>
                  <tbody>{result.preview.map((r, i) => (
                    <tr key={i} className="border-b border-teal-100">
                      <td className="py-1 text-teal-800">{r.item_name}</td>
                      <td className="py-1 text-teal-600">{r.market}</td>
                      <td className="py-1 text-right font-medium">{r.avg_price}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 font-outfit text-base font-semibold text-slate-900">Upload History</h2>
            {loadingData ? <LoadingSpinner label="Loading..." /> :
             dates.length === 0 ? <p className="text-sm text-slate-400">No data uploaded yet.</p> :
             <div className="space-y-1">
               {dates.map(d => (
                 <div key={d} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                   <span className="text-sm text-slate-700">{d}</span>
                   <span className="text-xs text-teal-600 font-medium">✓ Uploaded</span>
                 </div>
               ))}
             </div>
            }
          </Card>

          <Card>
            <h2 className="mb-3 font-outfit text-base font-semibold text-slate-900">
              Latest Prices
              {latest.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">({latest[0]?.date})</span>
              )}
            </h2>
            {loadingData ? <LoadingSpinner label="Loading..." /> :
             latest.length === 0 ? <p className="text-sm text-slate-400">No price data available.</p> :
             <div className="overflow-x-auto max-h-64 overflow-y-auto">
               <table className="w-full text-xs">
                 <thead><tr className="border-b border-slate-100">
                   <th className="text-left py-1 font-medium text-slate-500">Item</th>
                   <th className="text-left py-1 font-medium text-slate-500">Market</th>
                   <th className="text-right py-1 font-medium text-slate-500">Avg LKR</th>
                 </tr></thead>
                 <tbody>{latest.slice(0, 30).map((r, i) => (
                   <tr key={i} className="border-b border-slate-50">
                     <td className="py-1 text-slate-700">{r.item_name}</td>
                     <td className="py-1 text-slate-400">{r.market}</td>
                     <td className="py-1 text-right font-medium text-slate-700">{r.avg_price}</td>
                   </tr>
                 ))}</tbody>
               </table>
             </div>
            }
          </Card>
        </div>
      </div>
    </div>
  );
}