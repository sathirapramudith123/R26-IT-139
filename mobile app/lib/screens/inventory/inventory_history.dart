import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import '../common/record_details.dart';

/// Inventory item details: units sold (today / 7 days / 30 days / a date range),
/// every purchase (batch: when, how many, at what cost) and the stock left per cost.
class InventoryHistory extends StatefulWidget {
  final String id;
  final String unit; // " kg" or ""
  const InventoryHistory({super.key, required this.id, this.unit = ""});

  @override
  State<InventoryHistory> createState() => _InventoryHistoryState();
}

class _InventoryHistoryState extends State<InventoryHistory> {
  late DateTime from = DateTime.now().subtract(const Duration(days: 29));
  DateTime to = DateTime.now();
  Map<String, dynamic>? data;
  String? error;

  static String _ymd(DateTime d) =>
      "${d.year}-${d.month.toString().padLeft(2, "0")}-${d.day.toString().padLeft(2, "0")}";

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await Api.get("/inventory/${widget.id}/insights?from=${_ymd(from)}&to=${_ymd(to)}");
      if (mounted) {
        setState(() {
          data = Map<String, dynamic>.from(r as Map);
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    }
  }

  Future<void> _pick(bool isFrom) async {
    final d = await showDatePicker(
      context: context,
      initialDate: isFrom ? from : to,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (d == null) return;
    setState(() {
      if (isFrom) {
        from = d;
        if (to.isBefore(from)) to = from;
      } else {
        to = d;
        if (from.isAfter(to)) from = to;
      }
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    if (error != null) {
      return Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Text(error!, style: const TextStyle(color: KadeColors.terra)),
      );
    }
    if (data == null) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    final sales = Map<String, dynamic>.from(data!["sales"] as Map);
    final purchases = (data!["purchases"] as List).whereType<Map>().toList();
    final batches = (data!["batches"] as List).whereType<Map>().toList();
    final range = Map<String, dynamic>.from(sales["range"] as Map);
    final soft = Theme.of(context).textTheme.bodySmall;
    final u = widget.unit;

    Widget tile(String label, Map v) => Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark
              ? KadeColors.surfaceMutedDark
              : KadeColors.surfaceMutedLight,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(label, style: soft, textAlign: TextAlign.center),
            const SizedBox(height: 2),
            FittedBox(
              child: Text("${qtyOf(v["units"])}$u", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            ),
            FittedBox(
              child: Text(money(v["revenue"]), style: const TextStyle(fontSize: 11, color: KadeColors.success)),
            ),
          ],
        ),
      ),
    );

    return Column(
      children: [
        const SizedBox(height: 12),
        DetailCard(
          title: tr("Units sold"),
          icon: Icons.trending_up,
          children: [
            Row(
              children: [
                tile(tr("Today"), sales["today"] as Map),
                const SizedBox(width: 6),
                tile(tr("Last 7 days"), sales["last_7_days"] as Map),
                const SizedBox(width: 6),
                tile(tr("Last 30 days"), sales["last_30_days"] as Map),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(onPressed: () => _pick(true), child: Text("${tr("From")} ${_ymd(from)}")),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: OutlinedButton(onPressed: () => _pick(false), child: Text("${tr("To")} ${_ymd(to)}")),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              "${qtyOf(range["units"])}$u ${tr("sold in")} ${range["sales"]} ${tr("sales")} · ${money(range["revenue"])}",
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
        ),
        const SizedBox(height: 12),
        DetailCard(
          title: tr("Purchases (batches)"),
          icon: Icons.add_shopping_cart,
          children: [
            if (purchases.isEmpty) Text(tr("No purchases recorded yet."), style: soft),
            for (final p in purchases)
              DetailLine(
                title: "${dateOf(p["date"])} · ${qtyOf(p["quantity"])}$u",
                detail:
                    "${tr("${p["source"]}")}${p["ref"] != null ? " · ${p["ref"]}" : ""}"
                    "${p["estimated"] == true ? " · ${tr("estimated")}" : ""} · ${money(p["unit_cost"])} ${tr("each")}",
                trailing: money(p["total"]),
              ),
          ],
        ),
        const SizedBox(height: 12),
        DetailCard(
          title: tr("In stock now (by cost)"),
          icon: Icons.inventory_2_outlined,
          children: [
            for (var i = 0; i < batches.length; i++)
              DetailLine(
                title: "${batches[i]["batch_no"] ?? "${tr("Batch")} ${i + 1}"} · ${money(batches[i]["unit_cost"])}",
                detail: "${tr("Received")} ${dateOf(batches[i]["received_at"])}",
                trailing: "${qtyOf(batches[i]["remaining"])}$u ${tr("left")}",
              ),
            Text(tr("Sales use the oldest stock first (FIFO)."), style: soft),
          ],
        ),
      ],
    );
  }
}
