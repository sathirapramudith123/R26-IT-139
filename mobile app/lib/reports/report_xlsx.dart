// Minimal .xlsx writer for a ReportModel — an .xlsx file is a zip of XML parts. Written by hand
// because the `excel` package can't be installed next to `pdf` (they need different `xml`
// versions). Output: a Summary sheet with the KPIs, then one sheet per section with a blue
// header row, real numbers (money formatted), a bold totals row and a frozen header.
import 'dart:convert';
import 'dart:typed_data';
import 'package:archive/archive.dart';
import 'report_definitions.dart';

String _esc(String s) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

// A1-style column letters
String _col(int i) {
  var s = "";
  for (var n = i + 1; n > 0; n = (n - 1) ~/ 26) {
    s = String.fromCharCode(65 + (n - 1) % 26) + s;
  }
  return s;
}

// style ids in styles.xml below
const _sText = 0,
    _sHeader = 1,
    _sMoney = 2,
    _sNumber = 3,
    _sBold = 4,
    _sBoldMoney = 5,
    _sTotal = 6,
    _sTotalMoney = 7,
    _sTitle = 8;

String _cell(int r, int c, dynamic v, int style) {
  final ref = "${_col(c)}$r";
  if (v == null || "$v".isEmpty) return '<c r="$ref" s="$style"/>';
  if (v is num) return '<c r="$ref" s="$style"><v>$v</v></c>';
  return '<c r="$ref" s="$style" t="inlineStr"><is><t xml:space="preserve">${_esc("$v")}</t></is></c>';
}

String _sheet(List<String> rows, List<double> widths, {bool freeze = false, String? filter}) {
  final cols = [
    for (var i = 0; i < widths.length; i++)
      '<col min="${i + 1}" max="${i + 1}" width="${widths[i]}" customWidth="1"/>',
  ].join();
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      '<sheetViews><sheetView workbookViewId="0">'
      '${freeze ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : ''}'
      '</sheetView></sheetViews>'
      '<cols>$cols</cols><sheetData>${rows.join()}</sheetData>'
      '${filter != null ? '<autoFilter ref="$filter"/>' : ''}'
      '</worksheet>';
}

Uint8List buildReportXlsx(
  ReportModel model, {
  required String title,
  required String period,
  String business = "",
  required Map<String, String> labels, // summary, business, period, generated
}) {
  final sheets = <String, String>{}; // name -> xml
  final used = <String>{};
  String name(String s) {
    var base = s.replaceAll(RegExp(r'[:\\/?*\[\]]'), " ").trim();
    if (base.length > 28) base = base.substring(0, 28);
    var n = base.isEmpty ? "Sheet" : base;
    for (var i = 2; used.contains(n); i++) {
      n = "$base $i";
    }
    used.add(n);
    return n;
  }

  // ---- Summary ----
  var r = 1;
  final summary = <String>[
    '<row r="${r++}" ht="28" customHeight="1">${_cell(1, 0, title, _sTitle)}${_cell(1, 1, "", _sTitle)}</row>',
    '<row r="${r++}">${_cell(2, 0, labels["business"], _sText)}${_cell(2, 1, business.isEmpty ? "—" : business, _sBold)}</row>',
    '<row r="${r++}">${_cell(3, 0, labels["period"], _sText)}${_cell(3, 1, period, _sBold)}</row>',
    '<row r="${r++}">${_cell(4, 0, labels["generated"], _sText)}${_cell(4, 1, DateTime.now().toString().substring(0, 16), _sBold)}</row>',
  ];
  r++;
  for (final k in model.kpis) {
    final money = k.type == ColType.money && k.value is num;
    summary.add(
      '<row r="$r">${_cell(r, 0, k.label, _sText)}${_cell(r, 1, k.value, money ? _sBoldMoney : _sBold)}</row>',
    );
    r++;
  }
  sheets[name(labels["summary"] ?? "Summary")] = _sheet(summary, [34, 28]);

  // ---- one sheet per section ----
  for (final s in model.sections) {
    final rows = <String>[];
    rows.add(
      '<row r="1" ht="20" customHeight="1">${[for (var c = 0; c < s.columns.length; c++) _cell(1, c, s.columns[c].label, _sHeader)].join()}</row>',
    );
    var rr = 2;
    dynamic val(dynamic v, ReportColumn c) =>
        (c.type == ColType.money || c.type == ColType.number) && v != null && "$v".isNotEmpty
        ? (v is num ? v : num.tryParse("$v"))
        : (c.type == ColType.date ? (v == null ? null : formatCell(v, ColType.date)) : v);
    int style(ReportColumn c, bool bold) => c.type == ColType.money
        ? (bold ? _sBoldMoney : _sMoney)
        : c.type == ColType.number
        ? (bold ? _sBold : _sNumber)
        : (bold ? _sBold : _sText);
    for (final row in s.rows) {
      final bold = row["_bold"] == true;
      rows.add(
        '<row r="$rr">${[for (var c = 0; c < s.columns.length; c++) _cell(rr, c, val(row[s.columns[c].key], s.columns[c]), style(s.columns[c], bold))].join()}</row>',
      );
      rr++;
    }
    if (s.totals != null && s.rows.isNotEmpty) {
      rows.add(
        '<row r="$rr">${[for (var c = 0; c < s.columns.length; c++) _cell(rr, c, val(s.totals![s.columns[c].key], s.columns[c]), s.columns[c].type == ColType.money ? _sTotalMoney : _sTotal)].join()}</row>',
      );
    }
    final widths = [
      for (final c in s.columns)
        [
          12.0,
          c.label.length + 2.0,
          ...s.rows.take(200).map((x) => formatCell(x[c.key], c.type).length + 2.0),
        ].reduce((a, b) => a > b ? a : b).clamp(10.0, 48.0),
    ];
    sheets[name(s.heading)] = _sheet(
      rows,
      widths,
      freeze: true,
      filter: s.rows.isEmpty ? null : "A1:${_col(s.columns.length - 1)}1",
    );
  }

  // ---- package parts ----
  final names = sheets.keys.toList();
  final parts = <String, String>{
    "[Content_Types].xml":
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        '${[for (var i = 0; i < names.length; i++) '<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'].join()}'
        '</Types>',
    "_rels/.rels":
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        '</Relationships>',
    "xl/workbook.xml":
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets>${[for (var i = 0; i < names.length; i++) '<sheet name="${_esc(names[i])}" sheetId="${i + 1}" r:id="rId${i + 1}"/>'].join()}</sheets>'
        '</workbook>',
    "xl/_rels/workbook.xml.rels":
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '${[for (var i = 0; i < names.length; i++) '<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>'].join()}'
        '<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        '</Relationships>',
    // fonts: 0 normal, 1 bold white, 2 bold, 3 bold white 14 | fills: 2 brand blue, 3 light blue
    "xl/styles.xml":
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00;(#,##0.00)"/></numFmts>'
        '<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font>'
        '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
        '<font><b/><sz val="11"/><name val="Calibri"/></font>'
        '<font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
        '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
        '<fill><patternFill patternType="solid"><fgColor rgb="FF2A5BDB"/></patternFill></fill>'
        '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF4FF"/></patternFill></fill></fills>'
        '<borders count="2"><border/><border><top style="thin"><color rgb="FF2A5BDB"/></top></border></borders>'
        '<cellStyleXfs count="1"><xf/></cellStyleXfs>'
        '<cellXfs count="9">'
        '<xf/>' // 0 text
        '<xf fontId="1" fillId="2" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>' // 1 header
        '<xf numFmtId="164" applyNumberFormat="1"/>' // 2 money
        '<xf numFmtId="4" applyNumberFormat="1"/>' // 3 number
        '<xf fontId="2" applyFont="1"/>' // 4 bold
        '<xf fontId="2" numFmtId="164" applyFont="1" applyNumberFormat="1"/>' // 5 bold money
        '<xf fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>' // 6 total
        '<xf fontId="2" fillId="3" borderId="1" numFmtId="164" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/>' // 7 total money
        '<xf fontId="3" fillId="2" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>' // 8 title
        '</cellXfs></styleSheet>',
  };
  for (var i = 0; i < names.length; i++) {
    parts["xl/worksheets/sheet${i + 1}.xml"] = sheets[names[i]]!;
  }

  final archive = Archive();
  parts.forEach((path, xml) {
    final bytes = utf8.encode(xml);
    archive.addFile(ArchiveFile(path, bytes.length, bytes));
  });
  return Uint8List.fromList(ZipEncoder().encode(archive));
}
