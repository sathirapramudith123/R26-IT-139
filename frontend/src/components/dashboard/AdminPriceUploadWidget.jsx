"use client";
import { useRef, useState } from "react";
import { priceDataApi } from "@/services/api/priceData.api";

export default function AdminPriceUploadWidget({ onUploaded }) {
  const fileRef = useRef(null);
  const [session, setSession] = useState(null);
  const [dragging, setDragging] = useState(false);

  async function startBatch(files) {
    const pdfs = Array.from(files).filter(f => f.name.endsWith(".pdf"));
    if (pdfs.length === 0) return;

    pdfs.sort((a, b) => a.name.localeCompare(b.name));

    setSession({
      files: pdfs, total: pdfs.length,
      done: 0, failed: 0,
      current: pdfs[0].name,
      results: [], finished: false,
    });

    const results = [];
    let done = 0, failed = 0;

    for (let i = 0; i < pdfs.length; i++) {
      const file = pdfs[i];
      setSession(s => ({ ...s, current: file.name }));

      try {
        const data = await priceDataApi.uploadPdf(file);
        done++;
        results.push({ filename: file.name, date: data.report_date, saved: data.saved, error: null });
      } catch (err) {
        failed++;
        results.push({ filename: file.name, date: null, saved: 0, error: err.message || "Failed" });
      }

      setSession(s => ({
        ...s, done, failed,
        results: [...results],
        finished: i === pdfs.length - 1,
      }));
    }

    if (onUploaded) onUploaded({ total: done, failed });
  }

  function onFileChange(e) {
    if (e.target.files?.length) startBatch(e.target.files);
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files?.length) startBatch(e.dataTransfer.files);
  }

  function reset() {
    setSession(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const isRunning = session && !session.finished;
  const pct = session ? Math.round((session.done + session.failed) / session.total * 100) : 0;

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📤</span>
        <div>
          <h3 className="font-outfit font-semibold text-slate-900">Upload Price PDFs</h3>
          <p className="text-xs text-slate-400">HKARTI daily or weekly bulletins · Select multiple files at once</p>
        </div>
      </div>

      {!session && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors
            ${dragging ? "border-teal-400 bg-teal-50" : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"}`}
        >
          <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden" onChange={onFileChange} />
          <div className="text-4xl mb-3">📂</div>
          <p className="text-sm font-semibold text-slate-700 mb-1">Drop all PDFs here or click to browse</p>
          <p className="text-xs text-slate-400">Select multiple files at once — system processes them automatically</p>
          <div className="mt-4 inline-flex items-center gap-4 text-xs text-slate-400">
            <span>✓ Daily price bulletins</span>
            <span>✓ Weekly bulletins</span>
            <span>✓ Up to 200 files</span>
          </div>
        </div>
      )}

      {session && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">
                {session.finished
                  ? "Upload complete"
                  : `Uploading ${session.done + session.failed + 1} of ${session.total}...`}
              </span>
              <span className="text-xs text-slate-500">{pct}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${session.finished ? "bg-emerald-400" : "bg-teal-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {!session.finished && (
            <div className="flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-100 px-3 py-2">
              <span className="animate-spin text-sm">⏳</span>
              <span className="text-xs text-teal-700 truncate">
                Parsing: <strong>{session.current}</strong>
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-slate-800">{session.total}</p>
              <p className="text-[10px] text-slate-400">Total files</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-emerald-700">{session.done}</p>
              <p className="text-[10px] text-emerald-600">Uploaded</p>
            </div>
            <div className={`rounded-xl px-3 py-2 text-center ${session.failed > 0 ? "bg-red-50" : "bg-slate-50"}`}>
              <p className={`text-lg font-bold ${session.failed > 0 ? "text-red-600" : "text-slate-400"}`}>
                {session.failed}
              </p>
              <p className={`text-[10px] ${session.failed > 0 ? "text-red-500" : "text-slate-400"}`}>Failed</p>
            </div>
          </div>

          {session.finished && (
            <div className={`rounded-xl border px-4 py-3 text-sm font-semibold
              ${session.failed === 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              {session.failed === 0
                ? `✓ All ${session.done} PDFs uploaded successfully`
                : `✓ ${session.done} uploaded · ${session.failed} failed`}
            </div>
          )}

          <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-100 bg-white">
            <div className="grid grid-cols-3 text-[10px] font-semibold text-slate-500 px-3 py-1.5 border-b border-slate-100 sticky top-0 bg-white">
              <span>File</span><span>Date</span><span className="text-right">Records</span>
            </div>
            {session.results.map((r, i) => (
              <div key={i} className={`grid grid-cols-3 text-[10px] px-3 py-1.5 border-b border-slate-50 last:border-0 ${r.error ? "bg-red-50" : ""}`}>
                <span className="truncate text-slate-600" title={r.filename}>
                  {r.error ? "❌ " : "✓ "}{r.filename.replace(".pdf","").slice(-25)}
                </span>
                <span className="text-slate-400">{r.date || "—"}</span>
                <span className={`text-right font-medium ${r.error ? "text-red-500" : "text-teal-700"}`}>
                  {r.error ? r.error.slice(0,20) : `${r.saved} rows`}
                </span>
              </div>
            ))}
            {!session.finished && (
              <div className="grid grid-cols-3 text-[10px] px-3 py-1.5 bg-teal-50">
                <span className="text-teal-600 truncate">⏳ {session.current?.slice(-25)}</span>
                <span className="text-teal-400">processing...</span>
                <span></span>
              </div>
            )}
          </div>

          {session.finished && (
            <div className="flex gap-2">
              <button onClick={reset}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                Upload more files
              </button>
              <button onClick={() => priceDataApi.downloadCsv()}
                className="flex-1 rounded-xl border border-teal-200 bg-teal-50 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100 transition">
                ⬇ Export CSV
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}