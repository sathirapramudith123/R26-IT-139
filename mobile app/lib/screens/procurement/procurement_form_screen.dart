import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../services/crud_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;
import '../common/location_picker_map.dart';   // <-- path එක ඔයාගෙ folder එකට හදාගන්න

const List<String> _units = ["kg", "g", "l", "ml", "unit", "box", "carton"];
const List<Map<String, String>> _statuses = [
  {"value": "pending", "label": "Pending"},
  {"value": "ordered", "label": "Ordered"},
  {"value": "received", "label": "Received"},
  {"value": "cancelled", "label": "Cancelled"},
];

String _genPrNo() => "PR-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}";

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
  DateTime? arrivalDate;
  // Delivery location text — auto-filled from the map pin (search pick or
  // reverse geocoding), but still editable by hand.
  final deliveryLocationCtrl = TextEditingController();
  double? _lat;   // map coords
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
  bool loadingInventory = true;
  bool saving = false;
  String? error;

  bool get isEdit => widget.item != null;

  double get totalCost => items.fold(
      0.0, (s, l) => s + (l["quantity"] as num).toDouble() * (l["unit_cost"] as num).toDouble());
  double get totalQty =>
      items.fold(0.0, (s, l) => s + (l["quantity"] as num).toDouble());

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    prNo = it?["procurement_no"]?.toString() ?? _genPrNo();
    orderDate = _parse(it?["order_date"] ?? it?["date"]) ?? DateTime.now();
    arrivalDate = _parse(it?["arrival_date"]);
    final dl = it?["delivery_location"]?.toString();
    deliveryLocationCtrl.text = (dl != null && dl.isNotEmpty) ? dl : "";
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
      if (mounted) setState(() { inventory = objs; loadingInventory = false; });
    } catch (_) {
      if (mounted) setState(() { inventory = []; loadingInventory = false; });
    }
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

  // Item තෝරද්දි inventory cost එකෙන් unit_cost auto-fill
  void _onPickItem(String? val) {
    setState(() {
      pickItem = val;
      if (val != null) {
        final inv = _findItem(val);
        final cost = double.tryParse("${inv["cost_price"] ?? inv["unit_price"] ?? 0}") ?? 0;
        if (cost > 0) costCtrl.text = cost.toStringAsFixed(2);
      }
    });
  }

  void _addItem() {
    FocusScope.of(context).unfocus();
    final name = pickItem;
    final qty = double.tryParse(qtyCtrl.text.trim()) ?? 0;
    final cost = double.tryParse(costCtrl.text.trim()) ?? 0;

    if (name == null || name.isEmpty) { setState(() => error = "Select an item."); return; }
    if (qty <= 0) { setState(() => error = "Enter a valid quantity."); return; }
    if (cost <= 0) { setState(() => error = "Enter the unit cost."); return; }

    setState(() {
      error = null;
      items.add({"item_name": name, "unit": unit, "quantity": qty, "unit_cost": cost});
      pickItem = null;
      qtyCtrl.clear();
      costCtrl.clear();
    });
  }

  Future<void> _pickDate(bool isArrival) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: (isArrival ? arrivalDate : orderDate) ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 3),
    );
    if (picked != null) {
      setState(() => isArrival ? arrivalDate = picked : orderDate = picked);
    }
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

    if (items.isEmpty) { setState(() => error = "Add at least one item."); return; }
    if (deliveryLocationCtrl.text.trim().isEmpty) {
      setState(() => error = "Pick a delivery location on the map."); return;
    }
    if (arrivalDate == null) { setState(() => error = "Select the arrival date."); return; }

    final payload = <String, dynamic>{
      "procurement_no": prNo,
      "date": orderDate?.toIso8601String().substring(0, 10),
      "delivery_location": deliveryLocationCtrl.text.trim(),
      "coords": (_lat != null && _lng != null) ? {"lat": _lat, "lng": _lng} : null,
      "arrival_date": arrivalDate?.toIso8601String().substring(0, 10),
      "special_note": noteCtrl.text.trim(),
      "items": items,          // [{item_name, unit, quantity, unit_cost}]
      "total_cost": totalCost, // backend එකෙනුත් re-compute වෙනවා
      "status": status,        // RECEIVED නම් backend එකෙන් batches receive
    };

    setState(() { saving = true; error = null; });
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
    final names = inventory.map((i) => "${i["name"] ?? ""}").where((s) => s.isNotEmpty).toList();
    final dateStr = (DateTime? d) => d == null ? "Select date" : d.toIso8601String().substring(0, 10);

    return Scaffold(
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} Procurement")),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(prNo, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                InkWell(
                  onTap: saving ? null : () => _pickDate(false),
                  child: Row(children: [
                    const Icon(Icons.event, size: 16),
                    const SizedBox(width: 6),
                    Text(dateStr(orderDate)),
                  ]),
                ),
              ],
            ),
            const Divider(height: 28),

            // ── Add item ──
            fieldLabel("Item *"),
            DropdownButtonFormField<String>(
              value: names.contains(pickItem) ? pickItem : null,
              hint: Text(loadingInventory ? "Loading..." : (names.isEmpty ? "No inventory items" : "Select an item…")),
              items: names.map((o) {
                final inv = _findItem(o);
                return DropdownMenuItem(value: o, child: Text("$o (${inv["quantity"] ?? 0} in stock)"));
              }).toList(),
              onChanged: saving ? null : _onPickItem,
            ),
            const SizedBox(height: 10),

            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  fieldLabel("Quantity *"),
                  TextField(
                    controller: qtyCtrl,
                    enabled: !saving,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
                    decoration: const InputDecoration(hintText: "0"),
                  ),
                ]),
              ),
              const SizedBox(width: 10),
              SizedBox(
                width: 110,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  fieldLabel("Unit"),
                  DropdownButtonFormField<String>(
                    value: _units.contains(unit) ? unit : "unit",
                    items: _units.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
                    onChanged: saving ? null : (v) => setState(() => unit = v ?? "unit"),
                  ),
                ]),
              ),
            ]),
            const SizedBox(height: 10),

            fieldLabel("Unit Cost (LKR) *"),
            TextField(
              controller: costCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(
                  hintText: "0.00", prefixText: "LKR ", helperText: "Auto-filled from inventory cost — editable"),
            ),
            const SizedBox(height: 10),

            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.tonal(
                onPressed: (pickItem == null || saving) ? null : _addItem,
                child: const Text("+ Add item"),
              ),
            ),
            const SizedBox(height: 14),

            // ── Added items ──
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.black.withOpacity(0.03), borderRadius: BorderRadius.circular(14)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Text("Added items", style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                const SizedBox(height: 6),
                if (items.isEmpty)
                  const Padding(padding: EdgeInsets.symmetric(vertical: 6),
                      child: Text("No items added yet.", style: TextStyle(fontSize: 12, color: Colors.grey)))
                else
                  ...items.asMap().entries.map((e) {
                    final i = e.key;
                    final l = e.value;
                    final q = (l["quantity"] as num).toDouble();
                    final c = (l["unit_cost"] as num).toDouble();
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text("${l["item_name"]}", style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text("${q.toStringAsFixed(q == q.roundToDouble() ? 0 : 2)} ${l["unit"]} × LKR ${_money(c)}",
                                style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ]),
                        ),
                        Text("LKR ${_money(q * c)}", style: const TextStyle(fontWeight: FontWeight.w700)),
                        IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: saving ? null : () => setState(() => items.removeAt(i)),
                        ),
                      ]),
                    );
                  }),
                const Divider(),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text("Total qty: ${totalQty.toStringAsFixed(totalQty == totalQty.roundToDouble() ? 0 : 2)}",
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text("Total Cost: LKR ${_money(totalCost)}", style: const TextStyle(fontWeight: FontWeight.w800)),
                ]),
              ]),
            ),
            const SizedBox(height: 16),

            // ── Delivery location (map pin, with search + auto-filled address) ──
            fieldLabel("Delivery Location *"),
            LocationPickerMap(
              initialLat: _lat,
              initialLng: _lng,
              onPick: (lat, lng) => setState(() { _lat = lat; _lng = lng; }),
              onAddress: (addr) => setState(() => deliveryLocationCtrl.text = addr),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: deliveryLocationCtrl,
              enabled: !saving,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(hintText: "Address (auto-filled from the map — edit if needed)"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Arrival Date *"),
            InkWell(
              onTap: saving ? null : () => _pickDate(true),
              child: InputDecorator(
                decoration: const InputDecoration(),
                child: Row(children: [
                  const Icon(Icons.event, size: 18),
                  const SizedBox(width: 8),
                  Text(dateStr(arrivalDate)),
                ]),
              ),
            ),
            const SizedBox(height: 16),

            fieldLabel("Status"),
            DropdownButtonFormField<String>(
              value: status,
              items: _statuses.map((s) => DropdownMenuItem(value: s["value"], child: Text(s["label"]!))).toList(),
              onChanged: saving ? null : (v) => setState(() => status = v ?? "pending"),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 6, left: 2),
              child: Text("Setting 'Received' adds all items to inventory as batches",
                  style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color)),
            ),
            const SizedBox(height: 16),

            fieldLabel("Special Note"),
            TextField(
              controller: noteCtrl,
              enabled: !saving,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(hintText: "Optional note…"),
            ),
            const SizedBox(height: 28),

            saveButton(saving, isEdit, teal, _save),
          ],
        ),
      ),
    );
  }
}