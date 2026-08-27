// src/lib/reportPdf.js
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/formatters";

const num = (v) => Number(v || 0);

export function downloadIncomeStatementPdf(data, { period = "" } = {}) {
  const d = data || {};
  const revenue = num(d.total_revenue ?? d.revenue);
  const cogs = num(d.cost_of_goods_sold ?? d.costOfGoodsSold);
  const grossProfit =
    d.gross_profit != null ? num(d.gross_profit) : revenue - cogs;
  const opex = num(d.operating_expenses ?? d.operatingExpenses);
  const netProfit =
    d.net_profit != null ? num(d.net_profit) : grossProfit - opex;
  const margin =
    d.profit_margin_pct != null
      ? num(d.profit_margin_pct)
      : revenue
      ? (netProfit / revenue) * 100
      : 0;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Income & Expense Statement", pageWidth / 2, 50, {
    align: "center",
  });

  // Subtitle (date / period)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  const dateStr = new Date().toLocaleDateString();
  doc.text(
    `Generated: ${dateStr}${period ? "   |   Period: " + period : ""}`,
    pageWidth / 2,
    68,
    { align: "center" }
  );
  doc.setTextColor(0);

  const bold = { fontStyle: "bold" };

  autoTable(doc, {
    startY: 92,
    head: [["Description", "Amount"]],
    body: [
      ["Total Revenue / Sales", formatCurrency(revenue)],
      ["Cost of Goods Sold (Purchases)", `(${formatCurrency(cogs)})`],
      [
        { content: "Gross Profit", styles: bold },
        { content: formatCurrency(grossProfit), styles: bold },
      ],
      ["Operating Expenses", `(${formatCurrency(opex)})`],
      [
        { content: netProfit >= 0 ? "Net Income / Profit" : "Net Loss", styles: bold },
        { content: formatCurrency(netProfit), styles: bold },
      ],
      [
        { content: "Profit Margin", styles: bold },
        { content: `${margin.toFixed(2)}%`, styles: bold },
      ],
    ],
    columnStyles: { 1: { halign: "right" } },
    headStyles: { fillColor: [17, 153, 142] }, // teal
    styles: { fontSize: 11, cellPadding: 8 },
    theme: "grid",
  });

  doc.save(`income-statement-${Date.now()}.pdf`);
}