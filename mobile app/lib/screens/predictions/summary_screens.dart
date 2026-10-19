import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/i18n.dart';
import '../common/record_details.dart' show money, qtyOf, numOf;

/// "View all items" from the Predictions screen (same as the web pop-ups):
///   SalesSummaryScreen  — every item: total sold, average sale price, revenue, stock
///   StockStatusScreen   — every item: stock vs reorder level, deficit, Buy / Wait
/// Search by name and sort by any column.
class SalesSummaryScreen extends StatelessWidget {
  const SalesSummaryScreen({super.key});

  @override
  Widget build(BuildContext context) => _SummaryScreen(
    title: tr("All Items — Sales Summary"),
    path: "/insights/sales-summary",
    sorts: [
      ("total_sold", tr("Total Sold")),
      ("total_revenue", tr("Total Revenue")),
      ("avg_sale_price", tr("Avg Sale Price")),
      ("quantity", tr("Stock")),
      ("item", tr("Item")),
    ],
    tile: (r, sub) => Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("${r["item"]}", style: const TextStyle(fontWeight: FontWeight.w700)),
              Text(
                "${tr("Stock")}: ${qtyOf(r["quantity"])} · ${tr("Avg Sale Price")}: "
                "${r["avg_sale_price"] == null ? "—" : money(numOf(r["avg_sale_price"]))}",
                style: TextStyle(fontSize: 12, color: sub),
              ),
            ],
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              "${qtyOf(r["total_sold"])} ${tr("sold")}",
              style: const TextStyle(fontWeight: FontWeight.w800, color: KadeColors.teal),
            ),
            Text(
              numOf(r["total_revenue"]) > 0 ? money(numOf(r["total_revenue"])) : "—",
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: KadeColors.success),
            ),
          ],
        ),
      ],
    ),
  );
}

class StockStatusScreen extends StatelessWidget {
  const StockStatusScreen({super.key});

  @override
  Widget build(BuildContext context) => _SummaryScreen(
    title: tr("All Items — Stock Status"),
    path: "/insights/procurement-summary",
    sorts: [
      ("deficit", tr("Deficit")),
      ("quantity", tr("Stock")),
      ("reorder_level", tr("Reorder")),
      ("item", tr("Item")),
    ],
    tile: (r, sub) {
      final urgent = r["urgent"] == true;
      return Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("${r["item"]}", style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(
                  "${tr("Stock")}: ${qtyOf(r["quantity"])} · ${tr("Reorder")}: ${qtyOf(r["reorder_level"])}"
                  "${numOf(r["deficit"]) > 0 ? " · ${tr("Deficit")}: ${qtyOf(r["deficit"])}" : ""}",
                  style: TextStyle(fontSize: 12, color: sub),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: (urgent ? KadeColors.success : Colors.grey).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              urgent ? tr("🛒 Buy") : tr("⏳ Wait"),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: urgent ? KadeColors.success : null,
              ),
            ),
          ),
        ],
      );
    },
  );
}

class _SummaryScreen extends StatefulWidget {
  final String title;
  final String path;
  final List<(String, String)> sorts; // (field, label) — first is the default
  final Widget Function(Map<String, dynamic> row, Color? sub) tile;
  const _SummaryScreen({required this.title, required this.path, required this.sorts, required this.tile});

  @override
  State<_SummaryScreen> createState() => _SummaryScreenState();
}

class _SummaryScreenState extends State<_SummaryScreen> {
  List<Map<String, dynamic>>? rows;
  String? error;
  String search = "";
  late String sortKey = widget.sorts.first.$1;
  bool desc = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => error = null);
    try {
      final d = await Api.get(widget.path);
      final items = (d is Map && d["items"] is List) ? d["items"] as List : const [];
      if (mounted) {
        setState(() => rows = items.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList());
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    }
  }

  @override
  Widget build(BuildContext context) {
    final sub = Theme.of(context).textTheme.bodySmall?.color;
    final q = search.trim().toLowerCase();
    final list = (rows ?? const <Map<String, dynamic>>[])
        .where((r) => "${r["item"] ?? ""}".toLowerCase().contains(q))
        .toList();
    list.sort((a, b) {
      final cmp = sortKey == "item"
          ? "${a["item"] ?? ""}".toLowerCase().compareTo("${b["item"] ?? ""}".toLowerCase())
          : numOf(a[sortKey]).compareTo(numOf(b[sortKey]));
      return desc ? -cmp : cmp;
    });

    return Scaffold(
      appBar: AppBar(title: Text(widget.title, overflow: TextOverflow.ellipsis)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextField(
              decoration: InputDecoration(
                hintText: tr("Search item..."),
                prefixIcon: const Icon(Icons.search),
                isDense: true,
              ),
              onChanged: (v) => setState(() => search = v),
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final (key, label) in widget.sorts)
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: Text(sortKey == key ? "$label ${desc ? "▼" : "▲"}" : label),
                        selected: sortKey == key,
                        onSelected: (_) => setState(() {
                          if (sortKey == key) {
                            desc = !desc;
                          } else {
                            sortKey = key;
                            desc = key != "item";
                          }
                        }),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            if (error != null)
              Padding(
                padding: const EdgeInsets.all(24),
                child: Text(error!, style: const TextStyle(color: KadeColors.terra)),
              )
            else if (rows == null)
              const Padding(
                padding: EdgeInsets.only(top: 60),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (list.isEmpty)
              Padding(
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: Text(tr("No items match."), style: TextStyle(color: sub)),
                ),
              )
            else
              for (final r in list)
                Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(padding: const EdgeInsets.all(12), child: widget.tile(r, sub)),
                ),
          ],
        ),
      ),
    );
  }
}
