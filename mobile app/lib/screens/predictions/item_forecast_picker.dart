import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/i18n.dart';
import 'prediction_extras.dart' show ForecastChart;

/// "Forecast any item" on the Sales Forecast card (same as web): pick any inventory item — not only
/// the six best sellers — and see its past 8 weeks and next week's forecast.
/// GET /insights/forecast?item=
class ItemForecastPicker extends StatefulWidget {
  const ItemForecastPicker({super.key});

  @override
  State<ItemForecastPicker> createState() => _ItemForecastPickerState();
}

class _ItemForecastPickerState extends State<ItemForecastPicker> {
  List<String> names = [];
  String? item;
  Map<String, dynamic>? result;
  bool loading = false;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadNames();
  }

  Future<void> _loadNames() async {
    try {
      final rows = await Api.get("/inventory");
      final set = <String>{
        if (rows is List)
          for (final r in rows.whereType<Map>()) "${r["name"] ?? r["item_name"] ?? ""}".trim(),
      }..remove("");
      if (mounted) {
        setState(() => names = set.toList()..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase())));
      }
    } catch (_) {}
  }

  Future<void> _pick(String? v) async {
    setState(() {
      item = v;
      result = null;
      error = null;
      loading = v != null;
    });
    if (v == null) return;
    try {
      final r = await Api.get("/insights/forecast?item=${Uri.encodeQueryComponent(v)}");
      if (mounted && item == v) setState(() => result = r is Map ? Map<String, dynamic>.from(r) : null);
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sub = Theme.of(context).textTheme.bodySmall?.color;
    final r = result;
    final history = ((r?["history"] as List?) ?? const [])
        .map((w) => (((w as Map)["units"] as num?) ?? 0).toDouble())
        .toList();
    final f = r?["forecast_units"];
    final hasForecast = r?["available"] == true && f is num;
    final needsReorder = r != null && ((r["quantity"] as num?) ?? 0) <= ((r["reorder_level"] as num?) ?? 0);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: KadeColors.amber.withValues(alpha: 0.5)),
        borderRadius: BorderRadius.circular(KadeRadius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.search, size: 16, color: sub),
              const SizedBox(width: 6),
              Text(
                tr("Forecast any item"),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            initialValue: item,
            isExpanded: true,
            hint: Text(tr("Choose an item…")),
            decoration: const InputDecoration(isDense: true),
            items: [
              for (final n in names)
                DropdownMenuItem(
                  value: n,
                  child: Text(n, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: _pick,
          ),
          if (loading)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(error!, style: const TextStyle(color: KadeColors.terra, fontSize: 12)),
            )
          else if (r != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("${r["item"]}", style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                      Text(
                        "${tr("Stock:")} ${r["quantity"]} ${tr("· Reorder:")} ${r["reorder_level"]}",
                        style: TextStyle(fontSize: 11, color: sub),
                      ),
                      Text(
                        needsReorder ? tr("🚩 Reorder now") : tr("✓ Adequate"),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: needsReorder ? KadeColors.terra : KadeColors.success,
                        ),
                      ),
                    ],
                  ),
                ),
                if (hasForecast)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        "≈ ${f.toStringAsFixed(0)}",
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: KadeColors.teal,
                        ),
                      ),
                      Text(tr("units / next wk"), style: TextStyle(fontSize: 10, color: sub)),
                    ],
                  )
                else
                  Flexible(
                    child: Text(
                      tr("${r["reason"] ?? "No sales data yet"}"),
                      textAlign: TextAlign.right,
                      style: TextStyle(fontSize: 11, color: sub, fontStyle: FontStyle.italic),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            if (history.any((u) => u > 0)) ...[
              ForecastChart(history: history, forecast: hasForecast ? f.toDouble() : null),
              if (!hasForecast)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    tr("Past sales only — not enough sales in the last 4 weeks to forecast next week."),
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: sub, fontStyle: FontStyle.italic),
                  ),
                ),
            ] else
              Text(
                tr("This item has no sales in the last 8 weeks."),
                style: TextStyle(fontSize: 12, color: sub),
              ),
          ],
        ],
      ),
    );
  }
}
