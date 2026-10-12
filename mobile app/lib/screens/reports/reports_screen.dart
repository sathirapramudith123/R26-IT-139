import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import '../../reports/report_definitions.dart';
import '../../reports/report_pdf.dart';
import '../../reports/report_xlsx.dart';
import '../../services/auth_service.dart';

String _business() {
  final u = AuthService.currentUser;
  return "${u?["business_name"] ?? u?["full_name"] ?? u?["name"] ?? ""}";
}

/// Reports Center — every report in one list (same reports as the web app).
class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(tr("Reports"))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          Text(
            tr("View every report, preview it as a PDF and download it as PDF or Excel."),
            style: text.bodySmall,
          ),
          for (final g in reportGroups) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 20, 4, 8),
              child: Text(tr(g.name).toUpperCase(), style: text.labelSmall?.copyWith(letterSpacing: 1.2)),
            ),
            for (final id in g.ids)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    leading: CircleAvatar(
                      backgroundColor: KadeColors.teal.withValues(alpha: 0.1),
                      child: Text(reports[id]!.icon, style: const TextStyle(fontSize: 20)),
                    ),
                    title: Text(reports[id]!.title, style: text.titleSmall),
                    subtitle: Text(tr(reports[id]!.description), style: text.bodySmall),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => ReportViewScreen(reportId: id)),
                    ),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

/// One report: date range, Table / PDF preview, and PDF / Excel download.
class ReportViewScreen extends StatefulWidget {
  final String reportId;
  const ReportViewScreen({super.key, required this.reportId});

  @override
  State<ReportViewScreen> createState() => _ReportViewScreenState();
}

class _ReportViewScreenState extends State<ReportViewScreen> {
  late DateRange2 range = _quick("month");
  bool pdfView = false;
  ReportModel? model;
  String? error;
  bool loading = true;
  String? busy; // "pdf" | "excel"

  ReportDef get report => reports[widget.reportId]!;

  static DateRange2 _quick(String key) {
    final now = DateTime.now();
    switch (key) {
      case "last":
        return DateRange2(DateTime(now.year, now.month - 1, 1), DateTime(now.year, now.month, 0));
      case "7d":
        return DateRange2(now.subtract(const Duration(days: 6)), now);
      case "year":
        return DateRange2(DateTime(now.year, 1, 1), now);
      default:
        return DateRange2(DateTime(now.year, now.month, 1), now);
    }
  }

  String get period =>
      report.usesRange ? "${ymd(range.from)} → ${ymd(range.to)}" : "${tr("As of")} ${ymd(DateTime.now())}";
  String get periodEn =>
      report.usesRange ? "${ymd(range.from)} to ${ymd(range.to)}" : "As of ${ymd(DateTime.now())}";
  String get stamp => report.usesRange ? "${ymd(range.from)}-${ymd(range.to)}" : "";

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final m = await report.load(range, tr);
      if (mounted) setState(() => model = m);
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _setRange(DateRange2 r) {
    setState(() => range = r);
    _load();
  }

  Future<void> _pickRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: range.from, end: range.to),
    );
    if (picked != null) _setRange(DateRange2(picked.start, picked.end));
  }

  // English model → branded PDF (the PDF fonts can't draw Sinhala)
  Future<Uint8List> _pdfBytes() async {
    final en = await report.load(range, english);
    return buildReportPdf(en, title: report.name, period: periodEn, business: _business());
  }

  Future<void> _sharePdf() async {
    setState(() => busy = "pdf");
    try {
      await Printing.sharePdf(bytes: await _pdfBytes(), filename: pdfFileName(report.name, stamp));
    } catch (e) {
      _snack("$e");
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  Future<void> _shareExcel() async {
    if (model == null) return;
    setState(() => busy = "excel");
    try {
      final bytes = buildReportXlsx(
        model!,
        title: report.title,
        period: period,
        business: _business(),
        labels: {
          "summary": tr("Summary"),
          "business": tr("Business"),
          "period": tr("Period"),
          "generated": tr("Generated"),
        },
      );
      final dir = await getTemporaryDirectory();
      final name =
          "${report.name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-')}"
          "${stamp.isEmpty ? '' : '-$stamp'}.xlsx";
      final file = await File("${dir.path}/$name").writeAsBytes(bytes);
      await SharePlus.instance.share(
        ShareParams(
          files: [
            XFile(file.path, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
          ],
          subject: report.title,
        ),
      );
    } catch (e) {
      _snack("$e");
    } finally {
      if (mounted) setState(() => busy = null);
    }
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;

    return Scaffold(
      appBar: AppBar(
        title: Text(report.title, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            tooltip: tr("Refresh"),
            icon: const Icon(Icons.refresh),
            onPressed: () {
              clearReportCache();
              _load();
            },
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: model == null || busy != null ? null : _sharePdf,
                  icon: busy == "pdf"
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.picture_as_pdf_outlined),
                  label: const Text("PDF"),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: KadeColors.accent),
                  onPressed: model == null || busy != null ? null : _shareExcel,
                  icon: busy == "excel"
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.table_chart_outlined),
                  label: const Text("Excel"),
                ),
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          // ---- range + view switch ----
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (report.usesRange)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (final q in [
                          ["month", tr("This month")],
                          ["last", tr("Last month")],
                          ["7d", tr("Last 7 days")],
                          ["year", tr("This year")],
                        ])
                          Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: ChoiceChip(
                              label: Text(q[1]),
                              selected:
                                  ymd(_quick(q[0]).from) == ymd(range.from) &&
                                  ymd(_quick(q[0]).to) == ymd(range.to),
                              onSelected: (_) => _setRange(_quick(q[0])),
                            ),
                          ),
                        ActionChip(
                          avatar: const Icon(Icons.date_range, size: 16),
                          label: Text(tr("Custom")),
                          onPressed: _pickRange,
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(child: Text(period, style: text.bodySmall)),
                    SegmentedButton<bool>(
                      segments: [
                        ButtonSegment(
                          value: false,
                          icon: const Icon(Icons.table_rows_outlined),
                          label: Text(tr("Table")),
                        ),
                        ButtonSegment(
                          value: true,
                          icon: const Icon(Icons.picture_as_pdf_outlined),
                          label: const Text("PDF"),
                        ),
                      ],
                      selected: {pdfView},
                      showSelectedIcon: false,
                      onSelectionChanged: (s) => setState(() => pdfView = s.first),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: loading
                ? const Center(child: CircularProgressIndicator())
                : error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(error!, style: const TextStyle(color: KadeColors.terra)),
                    ),
                  )
                : pdfView
                ? PdfPreview(
                    key: ValueKey("${widget.reportId}|$period"),
                    build: (_) => _pdfBytes(),
                    canChangePageFormat: false,
                    canChangeOrientation: false,
                    canDebug: false,
                    pdfFileName: pdfFileName(report.name, stamp),
                    loadingWidget: const CircularProgressIndicator(),
                  )
                : _ReportBody(model: model!, teal: teal),
          ),
        ],
      ),
    );
  }
}

/// On-screen view of a report model: KPI cards, then each section as a table.
class _ReportBody extends StatelessWidget {
  final ReportModel model;
  final Color teal;
  const _ReportBody({required this.model, required this.teal});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    String kpiText(Kpi k) {
      if (k.value is! num) return "${k.value}";
      final v = formatCell(k.value, k.type == ColType.money ? ColType.money : ColType.number);
      return k.type == ColType.money ? "LKR $v" : v;
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        // ---- KPIs ----
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 2.1,
          children: [
            for (final k in model.kpis)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: teal.withValues(alpha: isDark ? 0.18 : 0.07),
                  borderRadius: BorderRadius.circular(KadeRadius.md),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(k.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.labelSmall),
                    const SizedBox(height: 4),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        kpiText(k),
                        style: text.titleMedium?.copyWith(
                          color: k.tone == "good"
                              ? KadeColors.success
                              : k.tone == "bad"
                              ? KadeColors.terra
                              : null,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        // ---- sections ----
        for (final s in model.sections) ...[
          const SizedBox(height: 20),
          Text(s.heading, style: text.titleMedium?.copyWith(color: teal)),
          const SizedBox(height: 8),
          Card(
            clipBehavior: Clip.antiAlias,
            // at least as wide as the card (a narrow table left an empty gap on the right);
            // wider tables still scroll sideways
            child: LayoutBuilder(
              builder: (context, box) => SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: ConstrainedBox(
                  constraints: BoxConstraints(minWidth: box.maxWidth),
                  child: DataTable(
                    headingRowColor: WidgetStatePropertyAll(teal),
                    headingTextStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                    columnSpacing: 22,
                    horizontalMargin: 14,
                    dataRowMinHeight: 40,
                    columns: [for (final c in s.columns) DataColumn(label: Text(c.label), numeric: c.right)],
                    rows: [
                      if (s.rows.isEmpty)
                        DataRow(
                          cells: [
                            for (var i = 0; i < s.columns.length; i++)
                              DataCell(
                                Text(i == 0 ? tr("No records for this period.") : "", style: text.bodySmall),
                              ),
                          ],
                        ),
                      for (var r = 0; r < s.rows.length; r++)
                        DataRow(
                          color: r.isOdd ? WidgetStatePropertyAll(teal.withValues(alpha: 0.04)) : null,
                          cells: [
                            for (final c in s.columns)
                              DataCell(
                                Text(
                                  formatCell(s.rows[r][c.key], c.type),
                                  style: TextStyle(
                                    fontWeight: s.rows[r]["_bold"] == true ? FontWeight.w700 : null,
                                    color: s.rows[r]["_bad"] == true && c.key == "status"
                                        ? KadeColors.terra
                                        : null,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      if (s.totals != null && s.rows.isNotEmpty)
                        DataRow(
                          color: WidgetStatePropertyAll(teal.withValues(alpha: 0.12)),
                          cells: [
                            for (final c in s.columns)
                              DataCell(
                                Text(
                                  formatCell(s.totals![c.key], c.type),
                                  style: const TextStyle(fontWeight: FontWeight.w700),
                                ),
                              ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
