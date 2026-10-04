import 'package:flutter/material.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';

/// Read-only view of one procurement order: items, total, supplier, delivery and the
/// ranked suppliers saved with it (the generic details dialog showed these as raw lists).
class ProcurementDetailsScreen extends StatelessWidget {
  final Map<String, dynamic> order;
  const ProcurementDetailsScreen({super.key, required this.order});

  static double _n(dynamic v) => v is num ? v.toDouble() : double.tryParse("${v ?? ""}") ?? 0;

  static String _money(dynamic v) {
    final n = _n(v);
    final parts = n.abs().toStringAsFixed(2).split(".");
    final whole = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ",");
    return "${n < 0 ? "-" : ""}LKR $whole.${parts[1]}";
  }

  static String _qty(dynamic v) {
    final n = _n(v);
    return n == n.roundToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(2);
  }

  static String _date(dynamic v) {
    final d = DateTime.tryParse("${v ?? ""}");
    if (d == null) return "—";
    final l = d.toLocal();
    return "${l.year}-${l.month.toString().padLeft(2, "0")}-${l.day.toString().padLeft(2, "0")}";
  }

  static (Color, String) _status(String s) {
    switch (s.toLowerCase()) {
      case "received":
        return (KadeColors.success, "Received");
      case "ordered":
        return (KadeColors.teal, "Ordered");
      case "cancelled":
        return (Colors.grey, "Cancelled");
      default:
        return (KadeColors.amber, "Pending");
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;

    final items = (order["items"] is List)
        ? (order["items"] as List).whereType<Map>().toList()
        : [
            if (order["item_name"] != null)
              {
                "item_name": order["item_name"],
                "quantity": order["quantity"],
                "unit_cost": order["unit_cost"],
              },
          ];
    final suppliers = (order["recommended_suppliers"] is List)
        ? (order["recommended_suppliers"] as List).whereType<Map>().toList()
        : <Map>[];
    final total =
        order["total_cost"] ?? items.fold<double>(0, (s, l) => s + _n(l["quantity"]) * _n(l["unit_cost"]));
    final (statusColor, statusLabel) = _status(
      "${order["status"] ?? order["procurement_status"] ?? "pending"}",
    );
    final note = "${order["special_note"] ?? ""}".trim();
    final location = "${order["delivery_location"] ?? ""}".trim();
    final supplier = "${order["selected_supplier_name"] ?? order["supplier_name"] ?? ""}".trim();

    Widget card(String title, IconData icon, Widget child) => Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: teal),
                const SizedBox(width: 8),
                Text(title, style: text.titleSmall),
              ],
            ),
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );

    Widget headerFact(String label, String value) => Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
          ),
        ],
      ),
    );

    return Scaffold(
      appBar: AppBar(title: Text(tr("Procurement Order"))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ---- header ----
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: KadeColors.headerGradient),
              borderRadius: BorderRadius.circular(KadeRadius.lg),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        "${order["procurement_no"] ?? tr("Procurement Order")}",
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        tr(statusLabel),
                        style: TextStyle(color: statusColor, fontWeight: FontWeight.w700, fontSize: 12),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  _money(total),
                  style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w700),
                ),
                Text(tr("Total Cost"), style: const TextStyle(color: Colors.white70, fontSize: 12)),
                const SizedBox(height: 14),
                Row(
                  children: [
                    headerFact(
                      tr("Order Date"),
                      _date(order["order_date"] ?? order["date"] ?? order["created_at"]),
                    ),
                    headerFact(tr("Expected Arrival"), _date(order["arrival_date"])),
                    headerFact(tr("Items"), "${items.length}"),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // ---- items ----
          card(
            tr("Items"),
            Icons.inventory_2_outlined,
            Column(
              children: [
                for (final l in items)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text("${l["item_name"] ?? "—"}", style: text.titleSmall),
                              Text(
                                "${_qty(l["quantity"])} ${tr("${l["unit"] ?? ""}")} × ${_money(l["unit_cost"])}",
                                style: text.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        Text(_money(_n(l["quantity"]) * _n(l["unit_cost"])), style: text.titleSmall),
                      ],
                    ),
                  ),
                const Divider(height: 20),
                Row(
                  children: [
                    Expanded(child: Text(tr("Total"), style: text.titleSmall)),
                    Text(_money(total), style: text.titleMedium?.copyWith(color: teal)),
                  ],
                ),
              ],
            ),
          ),

          // ---- supplier & delivery ----
          if (supplier.isNotEmpty || location.isNotEmpty) ...[
            const SizedBox(height: 12),
            card(
              tr("Delivery"),
              Icons.local_shipping_outlined,
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (supplier.isNotEmpty) _row(context, tr("Supplier"), supplier),
                  if (location.isNotEmpty) _row(context, tr("Delivery Location"), location),
                ],
              ),
            ),
          ],

          // ---- ranked suppliers saved with the order ----
          if (suppliers.isNotEmpty) ...[
            const SizedBox(height: 12),
            card(
              tr("Recommended Suppliers"),
              Icons.emoji_events_outlined,
              Column(
                children: [
                  for (var i = 0; i < suppliers.length; i++)
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: i == 0 ? KadeColors.success.withValues(alpha: 0.08) : null,
                        border: Border.all(
                          color: i == 0 ? KadeColors.success : Theme.of(context).dividerColor,
                        ),
                        borderRadius: BorderRadius.circular(KadeRadius.md),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(child: Text("${suppliers[i]["name"] ?? "—"}", style: text.titleSmall)),
                              if (i == 0)
                                Text(
                                  tr("🏆 Best overall"),
                                  style: const TextStyle(
                                    color: KadeColors.success,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            [
                              "${suppliers[i]["matchedCount"] ?? 0}/${items.length} ${tr("items")}",
                              if (suppliers[i]["totalPrice"] != null) _money(suppliers[i]["totalPrice"]),
                              if (suppliers[i]["distanceKm"] != null)
                                "${_n(suppliers[i]["distanceKm"]).toStringAsFixed(1)} km",
                            ].join(" · "),
                            style: text.bodySmall,
                          ),
                          if (suppliers[i]["missing"] is List && (suppliers[i]["missing"] as List).isNotEmpty)
                            Text(
                              "${tr("Missing:")} ${(suppliers[i]["missing"] as List).join(", ")}",
                              style: text.bodySmall?.copyWith(color: KadeColors.terra),
                            ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],

          // ---- note ----
          if (note.isNotEmpty) ...[
            const SizedBox(height: 12),
            card(tr("Special Note"), Icons.sticky_note_2_outlined, Text(note, style: text.bodyMedium)),
          ],
        ],
      ),
    );
  }

  Widget _row(BuildContext context, String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 120, child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
        Expanded(child: Text(value, style: Theme.of(context).textTheme.bodyMedium)),
      ],
    ),
  );
}
