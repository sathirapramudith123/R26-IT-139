// lib/core/report_pdf.dart
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

String _lkr(num v) => "LKR ${v.toStringAsFixed(2)}";

/// Builds the income statement PDF and opens the share / save / print sheet.
Future<void> shareIncomeStatementPdf(Map<String, dynamic> data) async {
  final num rev = data["total_revenue"] ?? 0;
  final num cogs = data["cost_of_goods_sold"] ?? 0;
  final num gross = data["gross_profit"] ?? (rev - cogs);
  final num opex = data["operating_expenses"] ?? 0;
  final num net = data["net_profit"] ?? (gross - opex);
  final num margin =
      data["profit_margin_pct"] ?? (rev != 0 ? (net / rev) * 100 : 0);

  final doc = pw.Document();

  doc.addPage(
    pw.Page(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(32),
      build: (context) {
        return pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.stretch,
          children: [
            pw.Center(
              child: pw.Text(
                "Income & Expense Statement",
                style: pw.TextStyle(
                  fontSize: 20,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
            pw.SizedBox(height: 4),
            pw.Center(
              child: pw.Text(
                "Generated: ${DateTime.now().toString().split('.').first}",
                style: const pw.TextStyle(
                  fontSize: 10,
                  color: PdfColors.grey700,
                ),
              ),
            ),
            pw.SizedBox(height: 24),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey400, width: 0.5),
              columnWidths: {
                0: const pw.FlexColumnWidth(3),
                1: const pw.FlexColumnWidth(2),
              },
              children: [
                _row("Description", "Amount", header: true),
                _row("Total Revenue / Sales", _lkr(rev)),
                _row("Cost of Goods Sold (Purchases)", "(${_lkr(cogs)})"),
                _row("Gross Profit", _lkr(gross), bold: true),
                _row("Operating Expenses", "(${_lkr(opex)})"),
                _row(
                  net >= 0 ? "Net Income / Profit" : "Net Loss",
                  _lkr(net),
                  bold: true,
                ),
                _row("Profit Margin", "${margin.toStringAsFixed(2)}%",
                    bold: true),
              ],
            ),
          ],
        );
      },
    ),
  );

  await Printing.sharePdf(
    bytes: await doc.save(),
    filename: "income-statement.pdf",
  );
}

pw.TableRow _row(String a, String b, {bool header = false, bool bold = false}) {
  final style = pw.TextStyle(
    fontWeight: (header || bold) ? pw.FontWeight.bold : pw.FontWeight.normal,
    fontSize: header ? 12 : 11,
    color: header ? PdfColors.white : PdfColors.black,
  );
  return pw.TableRow(
    decoration: header
        ? const pw.BoxDecoration(color: PdfColor.fromInt(0xFF11998E)) // teal
        : null,
    children: [
      pw.Padding(
        padding: const pw.EdgeInsets.all(8),
        child: pw.Text(a, style: style),
      ),
      pw.Padding(
        padding: const pw.EdgeInsets.all(8),
        child: pw.Text(b, style: style, textAlign: pw.TextAlign.right),
      ),
    ],
  );
}