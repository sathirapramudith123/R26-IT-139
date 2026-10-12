// Excel (.xlsx) export of a report model: a Summary sheet with the KPIs, then one sheet per
// section with a styled header, real numbers (so Excel can sum / chart them), totals and filters.
import { formatCell } from "./definitions";

const BRAND = "FF2A5BDB";
const BRAND_LIGHT = "FFEEF4FF";

// Excel sheet names: max 31 chars, no : \ / ? * [ ]
const sheetName = (s, used) => {
  let base =
    s
      .replace(/[:\\/?*[\]]/g, " ")
      .slice(0, 28)
      .trim() || "Sheet";
  let name = base;
  for (let i = 2; used.has(name); i++) name = `${base} ${i}`;
  used.add(name);
  return name;
};

// numbers and dates stay numbers / dates in Excel; text stays text
function cellValue(v, type) {
  if (v == null || v === "") return null;
  if (type === "money" || type === "number") return Number(v);
  if (type === "date") {
    const d = new Date(v);
    return isNaN(d) ? String(v) : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return String(v);
}

/** @returns Blob of the .xlsx file */
export async function buildReportExcel(model, { title, period, business, labels }) {
  const { default: ExcelJS } = await import("exceljs"); // big library — only loaded when exporting
  const wb = new ExcelJS.Workbook();
  wb.creator = "Lanka-Link";
  wb.created = new Date();
  const used = new Set();

  // ---- Summary sheet ----
  const sum = wb.addWorksheet(sheetName(labels.summary, used), { views: [{ showGridLines: false }] });
  sum.columns = [{ width: 34 }, { width: 26 }];
  sum.mergeCells("A1:B1");
  sum.getCell("A1").value = title;
  sum.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  sum.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
  sum.getRow(1).height = 30;
  sum.getCell("A1").alignment = { vertical: "middle", indent: 1 };
  sum.addRow([labels.business, business || "—"]);
  sum.addRow([labels.period, period || "—"]);
  sum.addRow([labels.generated, new Date().toLocaleString("en-LK")]);
  sum.addRow([]);
  for (const k of model.kpis || []) {
    const row = sum.addRow([k.label, typeof k.value === "number" ? k.value : String(k.value)]);
    row.getCell(1).font = { color: { argb: "FF5B6478" } };
    row.getCell(2).font = {
      bold: true,
      color: { argb: k.tone === "bad" ? "FFE5484D" : k.tone === "good" ? "FF22B573" : "FF2B3445" },
    };
    if (k.type === "money") row.getCell(2).numFmt = '#,##0.00 "LKR"';
    row.getCell(2).alignment = { horizontal: "right" };
  }

  // ---- one sheet per section ----
  for (const section of model.sections) {
    const ws = wb.addWorksheet(sheetName(section.heading, used), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = section.columns.map((c) => ({
      header: c.label,
      key: c.key,
      width: Math.min(
        48,
        Math.max(
          12,
          c.label.length + 2,
          ...section.rows.slice(0, 200).map((r) => formatCell(r[c.key], c.type).length + 2),
        ),
      ),
    }));
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.height = 22;
    header.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
      cell.alignment = { vertical: "middle" };
    });

    for (const r of section.rows) {
      const row = ws.addRow(
        Object.fromEntries(section.columns.map((c) => [c.key, cellValue(r[c.key], c.type)])),
      );
      if (r._bold) row.font = { bold: true };
    }
    if (section.totals) {
      const row = ws.addRow(
        Object.fromEntries(section.columns.map((c) => [c.key, cellValue(section.totals[c.key], c.type)])),
      );
      row.font = { bold: true };
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_LIGHT } };
        cell.border = { top: { style: "thin", color: { argb: BRAND } } };
      });
    }
    section.columns.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      if (c.type === "money") col.numFmt = "#,##0.00;(#,##0.00)";
      if (c.type === "number") col.numFmt = "#,##0.##";
      if (c.type === "date") col.numFmt = "yyyy-mm-dd";
      if (c.align === "right") col.alignment = { horizontal: "right" };
    });
    if (section.rows.length) {
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: section.columns.length } };
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
