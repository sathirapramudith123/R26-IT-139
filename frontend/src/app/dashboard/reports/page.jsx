"use client";

// Reports Center — every report in one place: view it as a table or a PDF preview, and
// download it as PDF or Excel. Report data and layout live in lib/reports/.
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, Table2, RefreshCw } from "lucide-react";
import useAuthGuard from "@/hooks/useAuthGuard";
import PageHeader from "@/components/common/PageHeader";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { tokenService } from "@/services/auth/tokenService";
import { REPORTS, REPORT_GROUPS, clearReportCache, formatCell } from "@/lib/reports/definitions";
import { t } from "@/lib/i18n";

// YYYY-MM-DD in the browser's timezone
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const now = new Date();
const RANGES = [
  {
    key: "month",
    get label() {
      return t("This month");
    },
    range: () => ({ from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) }),
  },
  {
    key: "last",
    get label() {
      return t("Last month");
    },
    range: () => ({
      from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)),
    }),
  },
  {
    key: "7d",
    get label() {
      return t("Last 7 days");
    },
    range: () => ({
      from: ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)),
      to: ymd(now),
    }),
  },
  {
    key: "year",
    get label() {
      return t("This year");
    },
    range: () => ({ from: ymd(new Date(now.getFullYear(), 0, 1)), to: ymd(now) }),
  },
];

const english = (s) => s; // PDF labels stay English (its fonts can't draw Sinhala)

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReportsPage() {
  useAuthGuard();
  const [reportId, setReportId] = useState("income");
  const [range, setRange] = useState(RANGES[0].range());
  const [view, setView] = useState("table"); // table | pdf
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [busy, setBusy] = useState(null); // "pdf" | "excel" while exporting
  const pdfUrlRef = useRef(null);

  // links can open a specific report: /dashboard/reports?report=stock
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("report");
    if (id && REPORTS[id]) setReportId(id);
  }, []);

  const report = REPORTS[reportId];
  const period = report.usesRange ? `${range.from} → ${range.to}` : `${t("As of")} ${ymd(new Date())}`;
  const periodEn = report.usesRange ? `${range.from} to ${range.to}` : `As of ${ymd(new Date())}`;
  // read after mount — the server render has no access to the stored user
  const [business, setBusiness] = useState("");
  useEffect(() => {
    const u = tokenService.getUser();
    setBusiness(u?.business_name || u?.full_name || u?.name || "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setModel(await REPORTS[reportId].load(range));
    } catch (e) {
      setModel(null);
      setError(e.message || t("Failed to load report"));
    } finally {
      setLoading(false);
    }
  }, [reportId, range]);

  useEffect(() => {
    load();
  }, [load]);

  // English model → branded PDF (also used for the preview)
  const makePdf = useCallback(async () => {
    const { buildReportPdf } = await import("@/lib/reports/pdf");
    const enModel = await REPORTS[reportId].load(range, english);
    return buildReportPdf(enModel, { title: REPORTS[reportId].name, period: periodEn, business });
  }, [reportId, range, periodEn, business]);

  // build the preview when the PDF view is open
  useEffect(() => {
    if (view !== "pdf" || loading || error) return;
    let cancelled = false;
    makePdf()
      .then((doc) => {
        if (cancelled) return;
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = URL.createObjectURL(doc.output("blob"));
        setPdfUrl(pdfUrlRef.current);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [view, loading, error, makePdf]);

  useEffect(() => () => pdfUrlRef.current && URL.revokeObjectURL(pdfUrlRef.current), []);

  async function downloadPdf() {
    setBusy("pdf");
    try {
      const { pdfFileName } = await import("@/lib/reports/pdf");
      const doc = await makePdf();
      doc.save(pdfFileName(report.name, report.usesRange ? `${range.from} ${range.to}` : ""));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function downloadExcel() {
    if (!model) return;
    setBusy("excel");
    try {
      const { buildReportExcel } = await import("@/lib/reports/excel");
      const blob = await buildReportExcel(model, {
        title: report.title,
        period,
        business,
        labels: {
          summary: t("Summary"),
          business: t("Business"),
          period: t("Period"),
          generated: t("Generated"),
        },
      });
      const stamp = report.usesRange ? `-${range.from}-${range.to}` : "";
      saveBlob(blob, `${report.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}${stamp}.xlsx`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  function refresh() {
    clearReportCache();
    load();
  }

  const quickKey = RANGES.find((r) => {
    const x = r.range();
    return x.from === range.from && x.to === range.to;
  })?.key;

  return (
    <div className="page-container">
      <PageHeader
        title={t("Reports")}
        description={t("View every report, preview it as a PDF and download it as PDF or Excel.")}
      />

      {/* ---- date range ---- */}
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">{t("From")}</label>
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="input-field !w-auto"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">{t("To")}</label>
          <input
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="input-field !w-auto"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.range())}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                quickKey === r.key
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={refresh} className="btn-ghost ml-auto !px-3" title={t("Refresh")}>
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
        {/* ---- report list ---- */}
        <nav className="card h-fit space-y-4 p-3">
          {REPORT_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {g.label}
              </p>
              <div className="space-y-1">
                {g.ids.map((id) => {
                  const r = REPORTS[id];
                  const active = id === reportId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setReportId(id)}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-gradient-to-r from-brand-600 to-brand-400 text-white shadow-card"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-lg leading-6">{r.icon}</span>
                      <span>
                        <span
                          className={`block text-sm font-semibold ${active ? "" : "text-slate-800 dark:text-slate-100"}`}
                        >
                          {r.title}
                        </span>
                        <span className={`block text-[11px] ${active ? "text-white/80" : "text-slate-400"}`}>
                          {r.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ---- the selected report ---- */}
        <section className="card min-w-0 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
                {report.icon} {report.title}
              </h2>
              <p className="text-xs text-slate-400">
                {period}
                {business ? ` · ${business}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full bg-slate-100 p-1 dark:bg-slate-800">
                {[
                  ["table", Table2, t("Table")],
                  ["pdf", FileText, t("PDF preview")],
                ].map(([key, Icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      view === key
                        ? "bg-white text-brand-700 shadow-card dark:bg-slate-900 dark:text-brand-400"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={downloadPdf}
                disabled={!model || !!busy}
                className="btn-primary !py-2"
              >
                <Download className="h-4 w-4" /> {busy === "pdf" ? t("Preparing…") : "PDF"}
              </button>
              <button
                type="button"
                onClick={downloadExcel}
                disabled={!model || !!busy}
                className="btn-accent !py-2"
              >
                <FileSpreadsheet className="h-4 w-4" /> {busy === "excel" ? t("Preparing…") : "Excel"}
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner label={t("Loading report...")} />
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
              <button type="button" onClick={refresh} className="btn-secondary ml-3 !py-1.5 !text-xs">
                {t("Try Again")}
              </button>
            </div>
          ) : view === "pdf" ? (
            pdfUrl ? (
              <>
                <iframe
                  title={report.title}
                  src={`${pdfUrl}#toolbar=1&view=FitH`}
                  className="h-[75vh] w-full rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800"
                />
                <p className="text-xs text-slate-400">{t("PDF reports are in English.")}</p>
              </>
            ) : (
              <LoadingSpinner label={t("Preparing…")} />
            )
          ) : (
            <ReportTable model={model} />
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------------- on-screen view of a report model ---------------- */
function ReportTable({ model }) {
  if (!model) return null;
  return (
    <div className="space-y-6">
      {model.kpis?.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.kpis.map((k) => (
            <div key={k.label} className="rounded-2xl bg-brand-50 p-4 dark:bg-brand-950">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
              <p
                className={`mt-1 font-display text-xl font-semibold ${
                  k.tone === "good"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : k.tone === "bad"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-800 dark:text-slate-100"
                }`}
              >
                {typeof k.value === "number"
                  ? `${k.type === "money" ? "LKR " : ""}${formatCell(k.value, k.type || "number")}`
                  : k.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {model.sections.map((s) => (
        <div key={s.heading}>
          <h3 className="mb-2 font-display text-base font-semibold text-brand-700 dark:text-brand-400">
            {s.heading}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-600 text-white">
                  {s.columns.map((c) => (
                    <th
                      key={c.key}
                      className={`whitespace-nowrap px-3 py-2.5 font-semibold ${c.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.rows.length === 0 ? (
                  <tr>
                    <td colSpan={s.columns.length} className="px-3 py-8 text-center text-slate-400">
                      {t("No records for this period.")}
                    </td>
                  </tr>
                ) : (
                  s.rows.map((r, i) => (
                    <tr
                      key={i}
                      className={`border-t border-slate-100 dark:border-slate-800 ${i % 2 ? "bg-slate-50/60 dark:bg-slate-800/30" : ""} ${r._bold ? "font-semibold" : ""}`}
                    >
                      {s.columns.map((c) => (
                        <td
                          key={c.key}
                          className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""} ${
                            r._tone === "bad" && c.key === "status" ? "font-semibold text-rose-600" : ""
                          }`}
                        >
                          {formatCell(r[c.key], c.type)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              {s.totals && s.rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-brand-200 bg-brand-50 font-semibold dark:border-brand-800 dark:bg-brand-950">
                    {s.columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-3 py-2.5 ${c.align === "right" ? "text-right tabular-nums" : ""}`}
                      >
                        {formatCell(s.totals[c.key], c.type)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
