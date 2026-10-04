import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import '../common/record_details.dart' show money, qtyOf, numOf, hasText;
import 'inventory_form_screen.dart';

/// Low Stock Alerts — items at or below their reorder level (web: /dashboard/inventory/alerts)
class InventoryAlertsScreen extends StatefulWidget {
  const InventoryAlertsScreen({super.key});
  @override
  State<InventoryAlertsScreen> createState() => _InventoryAlertsScreenState();
}

class _InventoryAlertsScreenState extends State<InventoryAlertsScreen> {
  bool loading = true;
  String? error;
  List<Map<String, dynamic>> items = [];
  int total = 0;
  bool changed = false; // tell the inventory list to reload after a restock

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
      final d = await Api.get("/inventory/status");
      if (d is Map) {
        items = (d["running_out"] is List)
            ? (d["running_out"] as List).whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList()
            : [];
        total = numOf((d["summary"] is Map) ? d["summary"]["total"] : 0).toInt();
      }
    } catch (e) {
      error = e.toString().replaceFirst("Exception: ", "");
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _restock(Map<String, dynamic> item) async {
    final ok = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => InventoryFormScreen(item: item)));
    if (ok == true) {
      changed = true;
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final soft = Theme.of(context).textTheme.bodySmall?.color;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.pop(context, changed);
      },
      child: Scaffold(
        appBar: AppBar(title: Text(tr("Low Stock Alerts"))),
        body: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(tr("Items at or below their reorder level."), style: TextStyle(color: soft)),
              const SizedBox(height: 12),
              if (loading)
                const Padding(
                  padding: EdgeInsets.only(top: 60),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (error != null)
                Text(tr(error!), style: const TextStyle(color: KadeColors.terra))
              else ...[
                Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(tr("Running out"), style: TextStyle(fontSize: 12, color: soft)),
                              const SizedBox(height: 4),
                              Text(
                                "${items.length}",
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w700,
                                  color: KadeColors.terra,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (total > 0) Text("/ $total ${tr("items")}", style: TextStyle(color: soft)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                if (items.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 40),
                    child: Column(
                      children: [
                        const Text("✅", style: TextStyle(fontSize: 40)),
                        const SizedBox(height: 8),
                        Text(tr("All stock healthy"), style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 4),
                        Text(
                          tr("No items have reached their reorder level."),
                          textAlign: TextAlign.center,
                          style: TextStyle(color: soft),
                        ),
                      ],
                    ),
                  )
                else
                  for (final it in items) _row(it),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(Map<String, dynamic> it) {
    final unit = hasText(it["unit"]) && it["unit"] != "unit" ? " ${tr("${it["unit"]}")}" : "";
    final price = it["cost_price"] ?? it["unit_price"];
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("${it["name"] ?? "—"}", style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text.rich(
                    TextSpan(
                      style: Theme.of(context).textTheme.bodySmall,
                      children: [
                        TextSpan(text: "${tr("Current Qty")}: "),
                        TextSpan(
                          text: "${qtyOf(it["quantity"])}$unit",
                          style: const TextStyle(color: KadeColors.terra, fontWeight: FontWeight.w700),
                        ),
                        TextSpan(text: "  ·  ${tr("Reorder Level")}: ${qtyOf(it["reorder_level"])}$unit"),
                        if (price != null) TextSpan(text: "  ·  ${money(price)}"),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(onPressed: () => _restock(it), child: Text(tr("Restock"))),
          ],
        ),
      ),
    );
  }
}
