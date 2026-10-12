// Branded PDF for any ReportModel (same design as the web app's lib/reports/pdf.js).
// English only — the PDF fonts can't draw Sinhala.
import 'dart:typed_data';
import 'package:flutter/services.dart' show rootBundle;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'report_definitions.dart';

const _brand = PdfColor.fromInt(0xFF2A5BDB);
const _brandLight = PdfColor.fromInt(0xFFEEF4FF);
const _ink = PdfColor.fromInt(0xFF2B3445);
const _soft = PdfColor.fromInt(0xFF8A94A6);
const _good = PdfColor.fromInt(0xFF22B573);
const _bad = PdfColor.fromInt(0xFFE5484D);

// The PDF's built-in font has no ✓ / ✗ glyphs (they print as a box) — leave them out
String _pdfSafe(String s) => s.replaceAll(RegExp("[✓✔✗✘]"), "").trim();

String _kpiText(Kpi k) {
  if (k.value is! num) return _pdfSafe("${k.value}");
  final v = formatCell(k.value, k.type == ColType.money ? ColType.money : ColType.number);
  return k.type == ColType.money ? "LKR $v" : v;
}

Future<Uint8List> buildReportPdf(
  ReportModel model, {
  required String title,
  required String period,
  String business = "",
}) async {
  final wide = model.sections.any((s) => s.columns.length > 6);
  final logo = pw.MemoryImage((await rootBundle.load("assets/icon/app_icon.png")).buffer.asUint8List());
  final generated = DateTime.now().toString().substring(0, 16);
  final doc = pw.Document(title: title, author: "Lanka-Link");

  doc.addPage(
    pw.MultiPage(
      pageFormat: wide ? PdfPageFormat.a4.landscape : PdfPageFormat.a4,
      margin: const pw.EdgeInsets.fromLTRB(0, 0, 0, 30),
      header: (ctx) => ctx.pageNumber == 1
          ? pw.Container(
              padding: const pw.EdgeInsets.fromLTRB(32, 24, 32, 22),
              color: _brand,
              child: pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.center,
                children: [
                  pw.Container(
                    width: 46,
                    height: 46,
                    padding: const pw.EdgeInsets.all(5),
                    decoration: pw.BoxDecoration(
                      color: PdfColors.white,
                      borderRadius: pw.BorderRadius.circular(10),
                    ),
                    child: pw.Image(logo),
                  ),
                  pw.SizedBox(width: 14),
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          "LANKA-LINK",
                          style: pw.TextStyle(
                            color: PdfColors.white,
                            fontSize: 9,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                        pw.Text(
                          title,
                          style: pw.TextStyle(
                            color: PdfColors.white,
                            fontSize: 18,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                        pw.Text(
                          business.isNotEmpty ? business : "Smart Merchant Support Platform",
                          style: const pw.TextStyle(color: PdfColors.white, fontSize: 9),
                        ),
                      ],
                    ),
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(period, style: const pw.TextStyle(color: PdfColors.white, fontSize: 9)),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        "Generated $generated",
                        style: const pw.TextStyle(color: PdfColors.white, fontSize: 8),
                      ),
                    ],
                  ),
                ],
              ),
            )
          : pw.SizedBox(height: 24),
      footer: (ctx) => pw.Container(
        margin: const pw.EdgeInsets.symmetric(horizontal: 32),
        padding: const pw.EdgeInsets.only(top: 6),
        decoration: const pw.BoxDecoration(
          border: pw.Border(top: pw.BorderSide(color: PdfColor.fromInt(0xFFE3E8F0))),
        ),
        child: pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text(
              "Lanka-Link · Smart Merchant Support Platform · Amounts in LKR",
              style: const pw.TextStyle(color: _soft, fontSize: 7.5),
            ),
            pw.Text(
              "Page ${ctx.pageNumber} of ${ctx.pagesCount}",
              style: const pw.TextStyle(color: _soft, fontSize: 7.5),
            ),
          ],
        ),
      ),
      build: (ctx) => [
        pw.Padding(
          padding: const pw.EdgeInsets.fromLTRB(32, 18, 32, 0),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // ---- KPI cards ----
              if (model.kpis.isNotEmpty)
                pw.Row(
                  children: [
                    for (var i = 0; i < model.kpis.length; i++) ...[
                      if (i > 0) pw.SizedBox(width: 8),
                      pw.Expanded(
                        child: pw.Container(
                          padding: const pw.EdgeInsets.all(10),
                          decoration: pw.BoxDecoration(
                            color: _brandLight,
                            borderRadius: pw.BorderRadius.circular(8),
                          ),
                          child: pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.start,
                            children: [
                              pw.Text(
                                model.kpis[i].label.toUpperCase(),
                                style: const pw.TextStyle(color: _soft, fontSize: 7.5),
                              ),
                              pw.SizedBox(height: 4),
                              // one line: scale down to fit (with cents, 4 cards wrapped "LKR" / amount)
                              pw.FittedBox(
                                fit: pw.BoxFit.scaleDown,
                                alignment: pw.Alignment.centerLeft,
                                child: pw.Text(
                                  _kpiText(model.kpis[i]),
                                  style: pw.TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: pw.FontWeight.bold,
                                    color: model.kpis[i].tone == "good"
                                        ? _good
                                        : model.kpis[i].tone == "bad"
                                        ? _bad
                                        : _ink,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              pw.SizedBox(height: 18),
            ],
          ),
        ),
        // ---- sections ----
        for (final s in model.sections) ...[
          pw.Padding(
            padding: const pw.EdgeInsets.fromLTRB(32, 0, 32, 8),
            child: pw.Text(
              s.heading,
              style: pw.TextStyle(color: _brand, fontSize: 12, fontWeight: pw.FontWeight.bold),
            ),
          ),
          pw.Padding(padding: const pw.EdgeInsets.symmetric(horizontal: 32), child: _table(s)),
          pw.SizedBox(height: 20),
        ],
      ],
    ),
  );
  return doc.save();
}

pw.Widget _table(ReportSection s) {
  pw.Widget cell(String text, ReportColumn c, {bool bold = false, PdfColor? color, PdfColor ink = _ink}) =>
      pw.Container(
        color: color,
        padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 5),
        alignment: c.right ? pw.Alignment.centerRight : pw.Alignment.centerLeft,
        child: pw.Text(
          _pdfSafe(text),
          style: pw.TextStyle(fontSize: 8.5, color: ink, fontWeight: bold ? pw.FontWeight.bold : null),
        ),
      );

  final rows = <pw.TableRow>[
    pw.TableRow(
      decoration: const pw.BoxDecoration(color: _brand),
      children: [for (final c in s.columns) cell(c.label, c, bold: true, ink: PdfColors.white)],
    ),
    if (s.rows.isEmpty)
      pw.TableRow(
        children: [
          for (var i = 0; i < s.columns.length; i++)
            cell(i == 0 ? "No records for this period." : "", s.columns[i], ink: _soft),
        ],
      ),
    for (var r = 0; r < s.rows.length; r++)
      pw.TableRow(
        decoration: r.isOdd ? const pw.BoxDecoration(color: PdfColor.fromInt(0xFFF7F9FD)) : null,
        children: [
          for (final c in s.columns)
            cell(
              formatCell(s.rows[r][c.key], c.type),
              c,
              bold: s.rows[r]["_bold"] == true,
              ink: s.rows[r]["_bad"] == true && c.key == "status" ? _bad : _ink,
            ),
        ],
      ),
    if (s.totals != null && s.rows.isNotEmpty)
      pw.TableRow(
        decoration: const pw.BoxDecoration(color: _brandLight),
        children: [for (final c in s.columns) cell(formatCell(s.totals![c.key], c.type), c, bold: true)],
      ),
  ];
  return pw.Table(children: rows);
}

String pdfFileName(String title, String stamp) =>
    "${title.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-')}${stamp.isEmpty ? '' : '-$stamp'}.pdf";
