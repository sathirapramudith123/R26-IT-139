// Branded PDF for any report model (see definitions.js). English only — the jsPDF fonts
// can't draw Sinhala.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCell } from "./definitions";

const BRAND = [42, 91, 219];
const BRAND_LIGHT = [238, 244, 255];
const INK = [43, 52, 69];
const SOFT = [138, 148, 166];
const GOOD = [34, 181, 115];
const BAD = [229, 72, 77];

let logoPromise = null;
// the app logo as a data URL (loaded once; the PDF still builds if it fails)
function loadLogo() {
  logoPromise ??= fetch("/images/lankalinklogo.png")
    .then((r) => r.blob())
    .then(
      (b) =>
        new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.readAsDataURL(b);
        }),
    )
    .catch(() => null);
  return logoPromise;
}

const kpiText = (k) =>
  typeof k.value === "number" ? formatCell(k.value, k.type || "number") : String(k.value);

/**
 * @param model   report model from REPORTS[id].load(range, english)
 * @param meta    { title, period, business }
 * @returns jsPDF document
 */
export async function buildReportPdf(model, { title, period, business }) {
  const wide = model.sections.some((s) => s.columns.length > 6);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: wide ? "landscape" : "portrait" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40; // page margin

  // ---- header band ----
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 96, "F");
  doc.setFillColor(74, 139, 240); // lighter blue corner, like the app's gradient
  doc.circle(W - 40, 10, 70, "F");

  const logo = await loadLogo();
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(M, 24, 48, 48, 10, 10, "F");
  if (logo) doc.addImage(logo, "PNG", M + 6, 30, 36, 36);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("LANKA-LINK", M + 62, 38);
  doc.setFontSize(19);
  doc.text(title, M + 62, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(business ? `${business}` : "Smart Merchant Support Platform", M + 62, 77);

  doc.setFontSize(9);
  doc.text(period || "", W - M, 46, { align: "right" });
  doc.text(`Generated ${new Date().toLocaleString("en-LK")}`, W - M, 62, { align: "right" });

  // ---- KPI cards ----
  let y = 120;
  const kpis = model.kpis || [];
  if (kpis.length) {
    const gap = 10;
    const cw = (W - M * 2 - gap * (kpis.length - 1)) / kpis.length;
    kpis.forEach((k, i) => {
      const x = M + i * (cw + gap);
      doc.setFillColor(...BRAND_LIGHT);
      doc.roundedRect(x, y, cw, 56, 8, 8, "F");
      doc.setTextColor(...SOFT);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(k.label.toUpperCase(), x + 12, y + 20, { maxWidth: cw - 24 });
      doc.setTextColor(...(k.tone === "good" ? GOOD : k.tone === "bad" ? BAD : INK));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      const prefix = k.type === "money" ? "LKR " : "";
      doc.text(`${prefix}${kpiText(k)}`, x + 12, y + 42, { maxWidth: cw - 24 });
    });
    y += 80;
  }

  // ---- sections ----
  for (const section of model.sections) {
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      y = 50;
    }
    doc.setTextColor(...BRAND);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text(section.heading, M, y);

    const head = [section.columns.map((c) => c.label)];
    const body = section.rows.length
      ? section.rows.map((r) =>
          section.columns.map((c) => ({
            content: formatCell(r[c.key], c.type),
            styles: {
              fontStyle: r._bold ? "bold" : "normal",
              ...(r._tone === "bad" && c.key === "status" ? { textColor: BAD } : {}),
            },
          })),
        )
      : [
          [
            {
              content: "No records for this period.",
              colSpan: section.columns.length,
              styles: { halign: "center", textColor: SOFT },
            },
          ],
        ];
    const foot = section.totals
      ? [section.columns.map((c) => formatCell(section.totals[c.key], c.type))]
      : undefined;

    autoTable(doc, {
      startY: y + 10,
      head,
      body,
      foot,
      showFoot: "lastPage",
      margin: { left: M, right: M, top: 50, bottom: 50 },
      theme: "plain",
      styles: {
        fontSize: 9,
        cellPadding: { top: 6, bottom: 6, left: 7, right: 7 },
        textColor: INK,
        overflow: "linebreak",
      },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 9 },
      footStyles: { fillColor: BRAND_LIGHT, textColor: INK, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 249, 253] },
      columnStyles: Object.fromEntries(
        section.columns.map((c, i) => [i, { halign: c.align === "right" ? "right" : "left" }]),
      ),
      didParseCell: (data) => {
        // right-align the head / foot cells of number columns too
        const col = section.columns[data.column.index];
        if (col?.align === "right" && data.section !== "body") data.cell.styles.halign = "right";
      },
    });
    y = doc.lastAutoTable.finalY + 30;
  }

  // ---- footer on every page ----
  const pages = doc.getNumberOfPages();
  const H = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(227, 232, 240);
    doc.line(M, H - 34, W - M, H - 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SOFT);
    doc.text("Lanka-Link · Smart Merchant Support Platform · Amounts in LKR", M, H - 20);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 20, { align: "right" });
  }
  return doc;
}

export const pdfFileName = (title, period) =>
  `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}${period ? `-${period.replace(/[^0-9]+/g, "-")}` : ""}.pdf`.replace(
    /-+/g,
    "-",
  );
