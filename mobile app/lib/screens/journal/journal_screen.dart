import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/journal_service.dart';

/// General Journal — double-entry (Debit / Credit) view with month → day drill-down.
class JournalScreen extends StatefulWidget {
  const JournalScreen({super.key});
  @override
  State<JournalScreen> createState() => _JournalScreenState();
}

class _JournalScreenState extends State<JournalScreen> {
  bool loading = true;
  List<Map<String, dynamic>> months = [];     // [{month:"2026-09", count}]
  String? selMonth;
  List<Map<String, dynamic>> days = [];        // [{date, entries, total_debit, total_credit}]
  Map<String, dynamic>? monthTotals;
  Map<String, dynamic>? selDay;                // the chosen day map

  static const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  @override
  void initState() {
    super.initState();
    _loadMonths();
  }

  Future<void> _loadMonths() async {
    setState(() => loading = true);
    try {
      final d = await JournalService.get();
      months = (d["months"] is List) ? (d["months"] as List).cast<Map<String, dynamic>>() : [];
    } catch (_) { months = []; }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> _openMonth(String ym) async {
    final parts = ym.split("-");
    setState(() { selMonth = ym; selDay = null; loading = true; });
    try {
      final d = await JournalService.get(year: int.parse(parts[0]), month: int.parse(parts[1]));
      days = (d["days"] is List) ? (d["days"] as List).cast<Map<String, dynamic>>() : [];
      monthTotals = d["totals"] as Map<String, dynamic>?;
    } catch (_) { days = []; }
    finally { if (mounted) setState(() => loading = false); }
  }

  void _openDay(Map<String, dynamic> day) => setState(() => selDay = day);

  void _back() {
    setState(() {
      if (selDay != null) { selDay = null; }
      else if (selMonth != null) { selMonth = null; days = []; }
    });
  }

  String _pretty(String ym) {
    final p = ym.split("-");
    return "${monthNames[int.parse(p[1]) - 1]} ${p[0]}";
  }

  String _money(num n) {
    final f = n == n.roundToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(2);
    final parts = f.split('.');
    final ip = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return parts.length > 1 ? "$ip.${parts[1]}" : ip;
  }

  @override
  Widget build(BuildContext context) {
    final canBack = selMonth != null || selDay != null;
    String title = "General Journal";
    if (selDay != null) title = "${selDay!["date"]}";
    else if (selMonth != null) title = _pretty(selMonth!);

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        leading: canBack ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: _back) : null,
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : selMonth == null
              ? _monthsView()
              : selDay == null
                  ? _daysView()
                  : _entriesView(selDay!),
    );
  }

  /* ---------- Level 1: months ---------- */
  Widget _monthsView() {
    if (months.isEmpty) return _empty("No transactions recorded yet.");
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text("Double-entry records (Debit / Credit) for every transaction.",
            style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color)),
        const SizedBox(height: 14),
        ...months.map((m) => Card(
              margin: const EdgeInsets.only(bottom: 10),
              clipBehavior: Clip.antiAlias,
              child: ListTile(
                leading: const Icon(Icons.calendar_month, color: KadeColors.teal),
                title: Text(_pretty(m["month"]), style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text("${m["count"]} transaction${m["count"] > 1 ? "s" : ""}"),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _openMonth(m["month"]),
              ),
            )),
      ],
    );
  }

  /* ---------- Level 2: days ---------- */
  Widget _daysView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (monthTotals != null) _balanceBanner(monthTotals!, "${_pretty(selMonth!)} total"),
        const SizedBox(height: 12),
        if (days.isEmpty) _empty("No entries this month.")
        else ...days.map((d) {
          final txnCount = ((d["entries"] as List).length / 2).round();
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            clipBehavior: Clip.antiAlias,
            child: ListTile(
              leading: const Icon(Icons.event_note, color: KadeColors.teal),
              title: Text("${d["date"]}", style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text("$txnCount txn · Dr ${_money(d["total_debit"])} · Cr ${_money(d["total_credit"])}"),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _openDay(d),
            ),
          );
        }),
      ],
    );
  }

  /* ---------- Level 3: entries ---------- */
  Widget _entriesView(Map<String, dynamic> day) {
    final entries = (day["entries"] as List).cast<Map<String, dynamic>>();
    num totalDr = 0, totalCr = 0;
    for (final e in entries) { totalDr += (e["debit"] ?? 0) as num; totalCr += (e["credit"] ?? 0) as num; }
    final balanced = (totalDr - totalCr).abs() < 0.01;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _balanceBanner({"total_debit": totalDr, "total_credit": totalCr, "balanced": balanced}, "Day total"),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.withOpacity(0.3)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(children: [
            // header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.1),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: Row(children: const [
                Expanded(flex: 5, child: Text("Particulars", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                Expanded(flex: 3, child: Text("Debit", textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                Expanded(flex: 3, child: Text("Credit", textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
              ]),
            ),
            ...entries.asMap().entries.map((me) {
              final i = me.key;
              final e = me.value;
              final isCr = e["direction"] == "CR";
              final newTxn = i % 2 == 0;
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(
                    color: Colors.grey.withOpacity(newTxn && i > 0 ? 0.3 : 0.12),
                    width: newTxn && i > 0 ? 1.5 : 0.5,
                  )),
                ),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(flex: 5, child: Padding(
                    padding: EdgeInsets.only(left: isCr ? 16 : 0),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text("${e["particulars"]}",
                          style: TextStyle(
                            fontSize: 12.5,
                            fontStyle: isCr ? FontStyle.italic : FontStyle.normal,
                            color: isCr ? Colors.grey[600] : null,
                            fontWeight: isCr ? FontWeight.normal : FontWeight.w600,
                          )),
                      if (newTxn)
                        Container(
                          margin: const EdgeInsets.only(top: 2),
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(color: Colors.grey.withOpacity(0.15), borderRadius: BorderRadius.circular(4)),
                          child: Text("${e["transaction_type"]}".toUpperCase(),
                              style: const TextStyle(fontSize: 8, color: Colors.grey)),
                        ),
                    ]),
                  )),
                  Expanded(flex: 3, child: Text(
                    (e["debit"] ?? 0) != 0 ? _money(e["debit"]) : "",
                    textAlign: TextAlign.right, style: const TextStyle(fontSize: 12, fontFamily: "monospace"))),
                  Expanded(flex: 3, child: Text(
                    (e["credit"] ?? 0) != 0 ? _money(e["credit"]) : "",
                    textAlign: TextAlign.right, style: const TextStyle(fontSize: 12, fontFamily: "monospace"))),
                ]),
              );
            }),
            // total row
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.1),
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
                border: Border(top: BorderSide(color: Colors.grey.withOpacity(0.4), width: 1.5)),
              ),
              child: Row(children: [
                const Expanded(flex: 5, child: Text("Total", textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.bold))),
                Expanded(flex: 3, child: Text(_money(totalDr), textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: "monospace"))),
                Expanded(flex: 3, child: Text(_money(totalCr), textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: "monospace"))),
              ]),
            ),
          ]),
        ),
      ],
    );
  }

  Widget _balanceBanner(Map<String, dynamic> t, String label) {
    final ok = t["balanced"] == true;
    final color = ok ? Colors.green : Colors.orange;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(ok ? Icons.check_circle : Icons.warning_amber, size: 16, color: color),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
          const Spacer(),
          Text(ok ? "Balanced ✓" : "Not balanced", style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
        ]),
        const SizedBox(height: 6),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text("Total Debit: ${_money(t["total_debit"])}", style: const TextStyle(fontSize: 12)),
          Text("Total Credit: ${_money(t["total_credit"])}", style: const TextStyle(fontSize: 12)),
        ]),
      ]),
    );
  }

  Widget _empty(String text) => Center(
        child: Padding(padding: const EdgeInsets.all(40), child: Text(text, style: const TextStyle(color: Colors.grey))),
      );
}