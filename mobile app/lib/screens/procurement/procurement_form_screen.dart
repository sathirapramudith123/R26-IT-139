import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../services/crud_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;
import '../common/location_picker_map.dart';
import '../../core/i18n.dart';
import '../common/record_details.dart' show qtyOf;
import '../../core/geo.dart';

const List<String> _units = ["kg", "g", "l", "ml", "unit", "box", "carton"];
const List<Map<String, String>> _statuses = [
  {"value": "pending", "label": "Pending"},
  {"value": "ordered", "label": "Ordered"},
  {"value": "received", "label": "Received"},
  {"value": "cancelled", "label": "Cancelled"},
];

String _genPrNo() => "PR-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}";

String _ymd(DateTime d) => d.toIso8601String().substring(0, 10);

// Straight-line distance (km) between two points — same Haversine formula as the web form
double _distanceKm(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371.0;
  double rad(double d) => d * math.pi / 180;
  final dLat = rad(lat2 - lat1);
  final dLng = rad(lng2 - lng1);
  final a =
      math.pow(math.sin(dLat / 2), 2) +
      math.cos(rad(lat1)) * math.cos(rad(lat2)) * math.pow(math.sin(dLng / 2), 2);
  return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

/// A supplier ranked for the whole order (how many of the added items they carry, then distance).
class _Candidate {
  final Map supplier;
  final int matchedCount;
  final List<String> matchedItems;
  final List<String> missing;
  final double totalPrice;
  final double? distanceKm;
  const _Candidate(
    this.supplier,
    this.matchedCount,
    this.matchedItems,
    this.missing,
    this.totalPrice,
    this.distanceKm,
  );

  String get name => "${supplier["name"] ?? ""}";
  int get leadTimeDays => (supplier["lead_time_days"] as num?)?.toInt() ?? 0;
  double? get lat => (supplier["latitude"] as num?)?.toDouble();
  double? get lng => (supplier["longitude"] as num?)?.toDouble();

  // snapshot saved with the order (same shape as the web form's recommended_suppliers)
  Map<String, dynamic> toJson() => {
    "id": supplier["id"],
    "name": name,
    "matchedCount": matchedCount,
    "matchedItems": matchedItems,
    "missing": missing,
    "distanceKm": distanceKm,
    "totalPrice": totalPrice,
    "delivery_location": supplier["delivery_location"],
  };
}

class ProcurementFormScreen extends StatefulWidget {
  final Map<String, dynamic>? item;
  const ProcurementFormScreen({super.key, this.item});

  @override
  State<ProcurementFormScreen> createState() => _ProcurementFormScreenState();
}

class _ProcurementFormScreenState extends State<ProcurementFormScreen> {
  final service = CrudService("/procurement");

  // Header
  late String prNo;
  DateTime? orderDate;
  // Delivery location text — auto-filled from the map pin (search pick or
  // reverse geocoding), but still editable by hand.
  final deliveryLocationCtrl = TextEditingController();
  double? _lat; // map coords
  double? _lng;
  final noteCtrl = TextEditingController();
  String status = "pending";

  // Add-item fields
  String? pickItem;
  final qtyCtrl = TextEditingController();
  final costCtrl = TextEditingController();
  String unit = "unit";

  // Added lines: [{item_name, unit, quantity, unit_cost}]
  final List<Map<String, dynamic>> items = [];

  List<Map<String, dynamic>> inventory = [];
  List<Map> suppliers = [];
  bool loadingInventory = true;
  bool saving = false;
  String? error;

  bool get isEdit => widget.item != null;

  double get totalCost =>
      items.fold(0.0, (s, l) => s + (l["quantity"] as num).toDouble() * (l["unit_cost"] as num).toDouble());
  double get totalQty => items.fold(0.0, (s, l) => s + (l["quantity"] as num).toDouble());

  // shown per unit ("1,700.25 kg · 48 pcs") — adding kg and pcs together meant nothing
  String get totalQtyByUnit {
    final byUnit = <String, double>{};
    for (final l in items) {
      final u = "${l["unit"] ?? "unit"}";
      byUnit[u] = (byUnit[u] ?? 0) + (l["quantity"] as num).toDouble();
    }
    return byUnit.entries.map((e) => "${qtyOf(e.value)} ${tr(e.key)}").join(" · ");
  }

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    prNo = it?["procurement_no"]?.toString() ?? _genPrNo();
    orderDate = _parse(it?["order_date"] ?? it?["date"]) ?? DateTime.now();
    final dl = it?["delivery_location"]?.toString();
    // an older order saved as "lat, lng": show the looked-up address instead
    final dlPoint = parseCoordText(dl);
    deliveryLocationCtrl.text = (dl != null && dl.isNotEmpty && dlPoint == null) ? dl : "";
    if (dlPoint != null) {
      reverseGeocode(dlPoint.$1, dlPoint.$2).then((addr) {
        if (addr != null && mounted && deliveryLocationCtrl.text.isEmpty) {
          setState(() => deliveryLocationCtrl.text = addr);
        }
      });
    }
    noteCtrl.text = it?["special_note"]?.toString() ?? "";
    status = (it?["status"]?.toString().isNotEmpty ?? false) ? it!["status"].toString() : "pending";

    // saved coords
    final coords = it?["coords"];
    if (coords is Map) {
      _lat = (coords["lat"] as num?)?.toDouble();
      _lng = (coords["lng"] as num?)?.toDouble();
    }

    final saved = it?["items"];
    if (saved is List) {
      for (final l in saved) {
        if (l is Map) {
          items.add({
            "item_name": l["item_name"],
            "unit": l["unit"] ?? "unit",
            "quantity": num.tryParse("${l["quantity"]}") ?? 0,
            "unit_cost": num.tryParse("${l["unit_cost"] ?? l["cost_price"]}") ?? 0,
          });
        }
      }
    }
    _loadInventory();
    _loadSuppliers();
  }

  DateTime? _parse(dynamic v) {
    if (v == null) return null;
    return DateTime.tryParse("$v");
  }

  Future<void> _loadInventory() async {
    try {
      final data = await Api.get("/inventory");
      final objs = (data is List)
          ? data.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
          : <Map<String, dynamic>>[];
      if (mounted) {
        setState(() {
          inventory = objs;
          loadingInventory = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          inventory = [];
          loadingInventory = false;
        });
      }
    }
  }

  Future<void> _loadSuppliers() async {
    try {
      final data = await Api.get("/suppliers");
      if (mounted) setState(() => suppliers = (data is List) ? data.whereType<Map>().toList() : []);
    } catch (_) {
      // ranking just stays empty
    }
  }

  List<Map> _itemsOf(Map s) =>
      (s["items_supplied"] is List) ? (s["items_supplied"] as List).whereType<Map>().toList() : <Map>[];

  String _key(dynamic name) => "${name ?? ""}".trim().toLowerCase();

  // Inventory items plus everything suppliers list under items_supplied — you can order
  // something a supplier carries before it exists in Inventory (same as the web form).
  List<String> get _itemNames {
    final names = <String>{
      ...inventory.map((i) => "${i["name"] ?? ""}"),
      for (final s in suppliers) ..._itemsOf(s).map((it) => "${it["item_name"] ?? ""}"),
    }..removeWhere((n) => n.isEmpty);
    return names.toList();
  }

  // Suppliers ranked for the whole order: most of the added items first, then nearest
  List<_Candidate> get _candidates {
    if (items.isEmpty) return [];
    final list = <_Candidate>[];
    for (final s in suppliers) {
      final carried = {for (final it in _itemsOf(s)) _key(it["item_name"]): it};
      final matched = items.where((l) => carried.containsKey(_key(l["item_name"]))).toList();
      if (matched.isEmpty) continue;
      final total = matched.fold<double>(
        0,
        (sum, l) =>
            sum +
            (l["quantity"] as num).toDouble() * ((carried[_key(l["item_name"])]!["unit_price"] as num?) ?? 0),
      );
      final lat = (s["latitude"] as num?)?.toDouble();
      final lng = (s["longitude"] as num?)?.toDouble();
      list.add(
        _Candidate(
          s,
          matched.length,
          matched.map((l) => "${l["item_name"]}").toList(),
          items
              .where((l) => !carried.containsKey(_key(l["item_name"])))
              .map((l) => "${l["item_name"]}")
              .toList(),
          total,
          (_lat != null && _lng != null && lat != null && lng != null)
              ? _distanceKm(_lat!, _lng!, lat, lng)
              : null,
        ),
      );
    }
    list.sort((a, b) {
      final byCount = b.matchedCount.compareTo(a.matchedCount);
      return byCount != 0
          ? byCount
          : (a.distanceKm ?? double.infinity).compareTo(b.distanceKm ?? double.infinity);
    });
    return list;
  }

  Map<String, dynamic> _findItem(String name) =>
      inventory.firstWhere((i) => "${i["name"] ?? ""}" == name, orElse: () => {});

  @override
  void dispose() {
    noteCtrl.dispose();
    qtyCtrl.dispose();
    costCtrl.dispose();
    deliveryLocationCtrl.dispose();
    super.dispose();
  }

  String _money(num n) {
    final fixed = n.toStringAsFixed(2);
    final parts = fixed.split('.');
    final intPart = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return "$intPart.${parts[1]}";
  }

  // picking an item fills unit_cost from its inventory cost
  void _onPickItem(String? val) {
    setState(() {
      pickItem = val;
      if (val != null) {
        final inv = _findItem(val);
        var cost = double.tryParse("${inv["cost_price"] ?? inv["unit_price"] ?? 0}") ?? 0;
        if (cost <= 0) {
          for (final s in suppliers) {
            final m = _itemsOf(s).where((it) => _key(it["item_name"]) == _key(val));
            if (m.isNotEmpty) {
              cost = (m.first["unit_price"] as num?)?.toDouble() ?? 0;
              final u = "${m.first["unit"] ?? ""}";
              if (_units.contains(u)) unit = u;
              break;
            }
          }
        }
        if (cost > 0) costCtrl.text = cost.toStringAsFixed(2);
      }
    });
  }

  void _addItem() {
    FocusScope.of(context).unfocus();
    final name = pickItem;
    final qty = double.tryParse(qtyCtrl.text.trim()) ?? 0;
    final cost = double.tryParse(costCtrl.text.trim()) ?? 0;

    if (name == null || name.isEmpty) {
      setState(() => error = tr("Select an item."));
      return;
    }
    if (qty <= 0) {
      setState(() => error = tr("Enter a valid quantity."));
      return;
    }
    if (cost <= 0) {
      setState(() => error = tr("Enter the unit cost."));
      return;
    }

    setState(() {
      error = null;
      items.add({"item_name": name, "unit": unit, "quantity": qty, "unit_cost": cost});
      pickItem = null;
      qtyCtrl.clear();
      costCtrl.clear();
    });
  }

  Future<void> _pickOrderDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: orderDate ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 3),
    );
    if (picked != null) setState(() => orderDate = picked);
  }

  // Expected arrival = order date + the best-match supplier's delivery lead time
  DateTime? _expectedArrival(_Candidate? best) =>
      best == null ? null : (orderDate ?? DateTime.now()).add(Duration(days: best.leadTimeDays));

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

    if (items.isEmpty) {
      setState(() => error = tr("Add at least one item."));
      return;
    }
    if (deliveryLocationCtrl.text.trim().isEmpty) {
      setState(() => error = tr("Pick a delivery location on the map."));
      return;
    }
    final candidates = _candidates;
    final best = candidates.isEmpty ? null : candidates.first;
    final arrival = _expectedArrival(best);

    // same payload as the web ProcurementForm
    final payload = <String, dynamic>{
      "procurement_no": prNo,
      "date": _ymd(orderDate ?? DateTime.now()),
      "delivery_location": deliveryLocationCtrl.text.trim(),
      "coords": (_lat != null && _lng != null) ? {"lat": _lat, "lng": _lng} : null,
      "special_note": noteCtrl.text.trim(),
      "items": items, // [{item_name, unit, quantity, unit_cost}]
      "total_cost": totalCost, // recomputed by the backend too
      "selected_supplier_name": best?.name,
      "arrival_date": arrival == null ? null : _ymd(arrival),
      "recommended_suppliers": candidates.map((c) => c.toJson()).toList(),
      "status": status, // RECEIVED: the backend receives the batches
    };

    setState(() {
      saving = true;
      error = null;
    });
    try {
      isEdit ? await service.update("${widget.item!["id"]}", payload) : await service.create(payload);
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;
    final names = _itemNames;
    final candidates = _candidates;
    final best = candidates.isEmpty ? null : candidates.first;
    final cheapest = candidates.isEmpty
        ? null
        : candidates.reduce((a, b) => b.totalPrice < a.totalPrice ? b : a);

    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? tr("Edit Procurement") : tr("New Procurement"))),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(tr(prNo), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                InkWell(
                  onTap: saving ? null : _pickOrderDate,
                  child: Row(
                    children: [
                      const Icon(Icons.event, size: 16),
                      const SizedBox(width: 6),
                      Text("${tr("Date:")} ${_ymd(orderDate ?? DateTime.now())}"),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 28),

            // ── Add item ──
            fieldLabel(tr("Item *")),
            DropdownButtonFormField<String>(
              initialValue: names.contains(pickItem) ? pickItem : null,
              isExpanded: true, // long item names overflowed the field
              hint: Text(
                loadingInventory
                    ? tr("Loading...")
                    : (names.isEmpty ? tr("No inventory items") : tr("Select an item…")),
              ),
              items: names.map((o) {
                final inv = _findItem(o);
                final stock = inv.isEmpty ? "" : " (${inv["quantity"] ?? 0} ${tr("in stock)")}";
                return DropdownMenuItem(value: o, child: Text("$o$stock", overflow: TextOverflow.ellipsis));
              }).toList(),
              onChanged: saving ? null : _onPickItem,
            ),
            const SizedBox(height: 10),

            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      fieldLabel(tr("Quantity *")),
                      TextField(
                        controller: qtyCtrl,
                        enabled: !saving,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
                        decoration: const InputDecoration(hintText: "0"),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      fieldLabel(tr("Unit")),
                      DropdownButtonFormField<String>(
                        initialValue: _units.contains(unit) ? unit : "unit",
                        isExpanded: true,
                        items: _units
                            .map(
                              (o) => DropdownMenuItem(
                                value: o,
                                child: Text(tr(o), overflow: TextOverflow.ellipsis),
                              ),
                            )
                            .toList(),
                        onChanged: saving ? null : (v) => setState(() => unit = v ?? "unit"),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            fieldLabel(tr("Unit Cost (LKR) *")),
            TextField(
              controller: costCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: InputDecoration(
                hintText: "0.00",
                helperText: tr("Buying price per unit (goes to the batch cost)"),
              ),
            ),
            const SizedBox(height: 10),

            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.tonal(
                onPressed: (pickItem == null || saving) ? null : _addItem,
                child: Text(tr("+ Add Item")),
              ),
            ),
            const SizedBox(height: 14),

            // ── Added items ──
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: teal.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(tr("Added items"), style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 6),
                  if (items.isEmpty)
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: 6),
                      child: Text(
                        tr("No items added yet."),
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    )
                  else
                    ...items.asMap().entries.map((e) {
                      final i = e.key;
                      final l = e.value;
                      final q = (l["quantity"] as num).toDouble();
                      final c = (l["unit_cost"] as num).toDouble();
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "${l["item_name"]}",
                                    style: const TextStyle(fontWeight: FontWeight.w700),
                                  ),
                                  Text(
                                    "${q.toStringAsFixed(q == q.roundToDouble() ? 0 : 2)} ${l["unit"]} × LKR ${_money(c)}",
                                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                            Text("LKR ${_money(q * c)}", style: const TextStyle(fontWeight: FontWeight.w700)),
                            IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              onPressed: saving ? null : () => setState(() => items.removeAt(i)),
                            ),
                          ],
                        ),
                      );
                    }),
                  const Divider(),
                  // two lines: side by side they ran off the card with large amounts
                  Text(
                    "${tr("Total Quantity:")} $totalQtyByUnit",
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                      "${tr("Total Cost")}: LKR ${_money(totalCost)}",
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ── Delivery location (map pin, with search + auto-filled address) ──
            fieldLabel(tr("Delivery Location *")),
            LocationPickerMap(
              initialLat: _lat,
              initialLng: _lng,
              onPick: (lat, lng) => setState(() {
                _lat = lat;
                _lng = lng;
              }),
              onAddress: (addr) => setState(() => deliveryLocationCtrl.text = addr),
              extraMarkers: [
                for (final c in candidates)
                  if (c.lat != null && c.lng != null)
                    MapMarkerPoint(
                      lat: c.lat!,
                      lng: c.lng!,
                      label: "${c.name} — ${c.matchedCount}/${items.length}",
                      highlight: identical(c, best),
                      cheapest: identical(c, cheapest) && !identical(c, best),
                    ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: deliveryLocationCtrl,
              enabled: !saving,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: tr("Address (auto-filled from the map — edit if needed)"),
              ),
            ),
            const SizedBox(height: 16),

            if (items.isNotEmpty) ...[
              _suppliersCard(teal, candidates, best, cheapest),
              const SizedBox(height: 16),
            ],

            if (isEdit) ...[
              fieldLabel(tr("Status")),
              DropdownButtonFormField<String>(
                initialValue: status,
                items: _statuses
                    .map((s) => DropdownMenuItem(value: s["value"], child: Text(tr(s["label"]!))))
                    .toList(),
                onChanged: saving ? null : (v) => setState(() => status = v ?? "pending"),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 6, left: 2),
                child: Text(
                  tr("Setting 'Received' adds all items to inventory as batches"),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
              const SizedBox(height: 16),
            ],

            fieldLabel(tr("Special Note")),
            TextField(
              controller: noteCtrl,
              enabled: !saving,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(hintText: tr("Enter special note here...")),
            ),
            const SizedBox(height: 28),

            saveButton(saving, isEdit, teal, _save),
          ],
        ),
      ),
    );
  }

  // Ranked suppliers for this order — best match first, cheapest marked, expected arrival
  Widget _suppliersCard(Color teal, List<_Candidate> candidates, _Candidate? best, _Candidate? cheapest) {
    final text = Theme.of(context).textTheme;
    final arrival = _expectedArrival(best);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(tr("Recommended Suppliers"), style: text.titleMedium?.copyWith(color: teal)),
            const SizedBox(height: 4),
            Text(
              tr("Best match first, then the next-nearest suppliers for this order."),
              style: text.bodySmall,
            ),
            if (_lat == null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  tr("Pick a delivery location below to rank by distance too."),
                  style: text.bodySmall,
                ),
              ),
            const SizedBox(height: 8),
            if (candidates.isEmpty)
              Text(tr("No known supplier carries any of these items yet."), style: text.bodySmall)
            else
              for (final c in candidates.take(5))
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: identical(c, best) ? KadeColors.success.withValues(alpha: 0.08) : null,
                    border: Border.all(
                      color: identical(c, best) ? KadeColors.success : Theme.of(context).dividerColor,
                    ),
                    borderRadius: BorderRadius.circular(KadeRadius.md),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(c.name, style: text.titleSmall),
                      // tags on their own line — beside the name they squeezed it to one word per line
                      if (identical(c, best) || identical(c, cheapest)) ...[
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 4,
                          runSpacing: 4,
                          children: [
                            if (identical(c, best)) _tag(tr("🏆 Best overall"), KadeColors.success),
                            if (identical(c, cheapest)) _tag(tr("💰 Cheapest"), KadeColors.amber),
                          ],
                        ),
                      ],
                      const SizedBox(height: 4),
                      Text(
                        "${c.matchedCount}/${items.length} ${tr("items")} · LKR ${_money(c.totalPrice)}"
                        "${c.distanceKm != null ? " · ${c.distanceKm!.toStringAsFixed(1)} km" : ""}"
                        " · ${c.leadTimeDays}${tr("-day delivery")}",
                        style: text.bodySmall,
                      ),
                      if (c.missing.isNotEmpty)
                        Text(
                          "${tr("Missing:")} ${c.missing.join(", ")}",
                          style: text.bodySmall?.copyWith(color: KadeColors.terra),
                        ),
                    ],
                  ),
                ),
            if (best != null && arrival != null) ...[
              const SizedBox(height: 12),
              Text(
                "${tr("Expected arrival:")} ${_ymd(arrival)} ${tr("(based on")} ${best.name}${tr("'s")} "
                "${best.leadTimeDays}${tr("-day lead time)")}",
                style: text.bodySmall?.copyWith(color: teal, fontWeight: FontWeight.w600),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _tag(String label, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(999)),
    child: Text(
      label,
      style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600),
    ),
  );
}
