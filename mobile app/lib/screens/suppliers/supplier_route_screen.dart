import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/i18n.dart';
import '../common/supplier_distance_map.dart';

/// "How far is this supplier?" — road route from where you are now, plus what the supplier
/// charges for delivery and how long they take. Opened from the supplier details dialog.
class SupplierRouteScreen extends StatelessWidget {
  final Map<String, dynamic> supplier;
  const SupplierRouteScreen({super.key, required this.supplier});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;
    final items = supplier["items_supplied"] is List ? supplier["items_supplied"] as List : const [];
    final cost = double.tryParse("${supplier["delivery_cost"]}") ?? 0;
    final lead = num.tryParse("${supplier["lead_time_days"]}") ?? 0;

    Widget fact(IconData icon, String label, String value) => Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 18, color: teal),
              const SizedBox(height: 6),
              Text(label, style: text.bodySmall),
              Text(value, style: text.titleSmall),
            ],
          ),
        ),
      ),
    );

    return Scaffold(
      appBar: AppBar(title: Text("${supplier["name"] ?? tr("Supplier")}")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(tr("Route from your current location"), style: text.titleMedium),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(KadeRadius.lg),
            child: SupplierDistanceMap(
              destinationLat: double.parse("${supplier["latitude"]}"),
              destinationLng: double.parse("${supplier["longitude"]}"),
              destinationLabel: "${supplier["name"] ?? ""}",
              height: 380,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              fact(Icons.local_shipping_outlined, tr("Delivery Cost (LKR)"), cost.toStringAsFixed(2)),
              const SizedBox(width: 10),
              fact(Icons.schedule, tr("Lead Time"), "$lead ${tr("days")}"),
              const SizedBox(width: 10),
              fact(Icons.inventory_2_outlined, tr("Items"), "${items.length}"),
            ],
          ),
          if ("${supplier["delivery_location"] ?? ""}".isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.place_outlined, size: 18, color: teal),
                const SizedBox(width: 6),
                Expanded(child: Text("${supplier["delivery_location"]}", style: text.bodyMedium)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
