import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../services/crud_service.dart';
import '../common/location_picker_map.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;
import '../../core/i18n.dart';

// Same units as the web form (INVENTORY_UNITS in frontend/src/lib/constants.js)
const _units = ["kg", "g", "l", "ml", "unit", "box", "carton"];

/// One item the supplier carries, with how much they have available.
class _SupplyItem {
  final String name;
  final double quantity;
  final String unit;
  final double unitPrice;
  const _SupplyItem(this.name, this.quantity, this.unit, this.unitPrice);

  Map<String, dynamic> toJson() => {
    "item_name": name,
    "quantity": quantity,
    "unit": unit,
    "unit_price": unitPrice,
  };
}

/// Accepts the old shape (["Rice", "Sugar"]) as well as [{item_name, quantity, unit, unit_price}].
List<_SupplyItem> _parseItems(dynamic raw) {
  if (raw is! List) return [];
  return raw.map((it) {
    if (it is String) return _SupplyItem(it, 0, "kg", 0);
    final m = it as Map;
    return _SupplyItem(
      "${m["item_name"] ?? ""}",
      (m["quantity"] as num?)?.toDouble() ?? 0,
      "${m["unit"] ?? "kg"}",
      (m["unit_price"] as num?)?.toDouble() ?? 0,
    );
  }).toList();
}

class SupplierFormScreen extends StatefulWidget {
  final Map<String, dynamic>? item;
  const SupplierFormScreen({super.key, this.item});

  @override
  State<SupplierFormScreen> createState() => _SupplierFormScreenState();
}

class _SupplierFormScreenState extends State<SupplierFormScreen> {
  final service = CrudService("/suppliers");
  final nameCtrl = TextEditingController();
  final companyCtrl = TextEditingController();
  final contactCtrl = TextEditingController();
  final emailCtrl = TextEditingController();
  final deliveryCtrl = TextEditingController();
  final leadTimeCtrl = TextEditingController();
  // Delivery location text — auto-filled from the map pin (via reverse
  // geocoding or a picked search suggestion), but still editable by hand.
  final deliveryLocationCtrl = TextEditingController();

  // "Items Supplied" entry row
  final itemNameCtrl = TextEditingController();
  final itemQtyCtrl = TextEditingController();
  final itemPriceCtrl = TextEditingController();
  String itemUnit = "kg";
  String? itemError;
  List<_SupplyItem> suppliedItems = [];

  double? latitude;
  double? longitude;
  bool saving = false;
  String? error;

  bool get isEdit => widget.item != null;
  double get totalAvailable => suppliedItems.fold(0, (s, it) => s + it.quantity);

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    nameCtrl.text = it?["name"]?.toString() ?? "";
    companyCtrl.text = it?["company_name"]?.toString() ?? "";
    contactCtrl.text = it?["contact_number"]?.toString() ?? "";
    emailCtrl.text = it?["email"]?.toString() ?? "";
    deliveryCtrl.text = it?["delivery_cost"]?.toString() ?? "";
    leadTimeCtrl.text = it?["lead_time_days"]?.toString() ?? "1";
    deliveryLocationCtrl.text = it?["delivery_location"]?.toString() ?? "";
    latitude = (it?["latitude"] as num?)?.toDouble();
    longitude = (it?["longitude"] as num?)?.toDouble();
    suppliedItems = _parseItems(it?["items_supplied"]);
  }

  @override
  void dispose() {
    for (final c in [
      nameCtrl,
      companyCtrl,
      contactCtrl,
      emailCtrl,
      deliveryCtrl,
      leadTimeCtrl,
      deliveryLocationCtrl,
      itemNameCtrl,
      itemQtyCtrl,
      itemPriceCtrl,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _addItem() {
    final name = itemNameCtrl.text.trim();
    final qty = double.tryParse(itemQtyCtrl.text.trim());
    final price = itemPriceCtrl.text.trim().isEmpty ? 0.0 : double.tryParse(itemPriceCtrl.text.trim());
    if (name.isEmpty) {
      setState(() => itemError = tr("Item name is required."));
      return;
    }
    if (qty == null || qty <= 0) {
      setState(() => itemError = tr("Enter a valid quantity."));
      return;
    }
    if (price == null || price < 0) {
      setState(() => itemError = tr("Unit price cannot be negative."));
      return;
    }
    setState(() {
      suppliedItems = [...suppliedItems, _SupplyItem(name, qty, itemUnit, price)];
      itemNameCtrl.clear();
      itemQtyCtrl.clear();
      itemPriceCtrl.clear();
      itemUnit = "kg";
      itemError = null;
    });
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

    if (nameCtrl.text.trim().isEmpty) {
      setState(() => error = tr("Supplier Name is required."));
      return;
    }
    final phone = contactCtrl.text.trim();
    if (phone.isEmpty) {
      setState(() => error = tr("Contact Number is required."));
      return;
    }
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 9 || digits.length > 12) {
      setState(() => error = tr("Enter a valid contact number (e.g. 0771234567)."));
      return;
    }
    final email = emailCtrl.text.trim();
    if (email.isNotEmpty && !RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
      setState(() => error = tr("Please enter a valid email address."));
      return;
    }

    // same payload as the web SupplierForm
    final payload = <String, dynamic>{
      "name": nameCtrl.text.trim(),
      "company_name": companyCtrl.text.trim(),
      "contact_number": phone,
      "email": email,
      "delivery_location": deliveryLocationCtrl.text.trim(),
      "delivery_cost": num.tryParse(deliveryCtrl.text.trim()) ?? 0,
      "lead_time_days": int.tryParse(leadTimeCtrl.text.trim()) ?? 1,
      "items_supplied": suppliedItems.map((it) => it.toJson()).toList(),
      "available_quantity": totalAvailable, // derived — sum of all item quantities
      "latitude": latitude,
      "longitude": longitude,
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

  String _num(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(2);

  @override
  Widget build(BuildContext context) {
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;
    final money = [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))];

    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? tr("Edit Supplier") : tr("Add Supplier"))),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],

            fieldLabel(tr("Supplier Name *")),
            TextField(
              controller: nameCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(hintText: tr("e.g. ABC Traders")),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Company Name")),
            TextField(
              controller: companyCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(hintText: tr("e.g. ABC Holdings (Pvt) Ltd")),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Contact Number *")),
            TextField(
              controller: contactCtrl,
              enabled: !saving,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              maxLength: 12,
              decoration: const InputDecoration(hintText: "07XXXXXXXX", counterText: ""),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Email")),
            TextField(
              controller: emailCtrl,
              enabled: !saving,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(hintText: "supplier@example.com"),
            ),
            const SizedBox(height: 16),

            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      fieldLabel(tr("Delivery Cost (LKR)")),
                      TextField(
                        controller: deliveryCtrl,
                        enabled: !saving,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        inputFormatters: money,
                        decoration: InputDecoration(
                          hintText: "0.00",
                          helperText: tr("Fixed delivery fee per shipment"),
                          helperMaxLines: 2,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      fieldLabel(tr("Delivery Lead Time (Days)")),
                      TextField(
                        controller: leadTimeCtrl,
                        enabled: !saving,
                        keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        decoration: InputDecoration(
                          hintText: "1",
                          helperText: tr("Days needed to deliver items (For AI Reorder Buffer)"),
                          helperMaxLines: 2,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            _itemsSupplied(teal, money),
            const SizedBox(height: 20),

            fieldLabel(tr("Location")),
            TextField(
              controller: deliveryLocationCtrl,
              enabled: !saving,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(hintText: tr("e.g. Panguwa, Thambana, Monaragala District")),
            ),
            const SizedBox(height: 6),
            Text(
              tr("Tip: You can click on the map and pick the exact location"),
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 10),
            LocationPickerMap(
              initialLat: latitude,
              initialLng: longitude,
              height: 240,
              onPick: (lat, lng) => setState(() {
                latitude = lat;
                longitude = lng;
              }),
              onAddress: (addr) => setState(() => deliveryLocationCtrl.text = addr),
            ),
            const SizedBox(height: 28),

            saveButton(saving, isEdit, teal, _save),
          ],
        ),
      ),
    );
  }

  // "Items Supplied" card — add row, list of items, total available quantity
  Widget _itemsSupplied(Color teal, List<TextInputFormatter> money) {
    final text = Theme.of(context).textTheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(tr("Items Supplied"), style: text.titleMedium?.copyWith(color: teal)),
            const SizedBox(height: 12),
            TextField(
              controller: itemNameCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(labelText: tr("Item Name"), hintText: tr("e.g. Rice 5kg")),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: itemQtyCtrl,
                    enabled: !saving,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: money,
                    decoration: InputDecoration(labelText: tr("Quantity"), hintText: "0"),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  // takes a share of the row (a fixed width overflowed with longer unit names)
                  child: DropdownButtonFormField<String>(
                    value: itemUnit,
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: tr("Unit"),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 16),
                    ),
                    items: _units
                        .map(
                          (u) => DropdownMenuItem(
                            value: u,
                            child: Text(tr(u), overflow: TextOverflow.ellipsis),
                          ),
                        )
                        .toList(),
                    onChanged: saving ? null : (u) => setState(() => itemUnit = u ?? "kg"),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: itemPriceCtrl,
                    enabled: !saving,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: money,
                    decoration: InputDecoration(labelText: tr("Unit Price (LKR)"), hintText: "0.00"),
                  ),
                ),
              ],
            ),
            if (itemError != null) ...[
              const SizedBox(height: 6),
              Text(itemError!, style: const TextStyle(color: KadeColors.terra, fontSize: 12)),
            ],
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton.icon(
                onPressed: saving ? null : _addItem,
                icon: const Icon(Icons.add, size: 18),
                label: Text(tr("Add Item")),
              ),
            ),
            const Divider(height: 24),
            if (suppliedItems.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Center(child: Text(tr("No items added yet."), style: text.bodySmall)),
              )
            else
              for (var i = 0; i < suppliedItems.length; i++)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  leading: CircleAvatar(
                    radius: 14,
                    backgroundColor: teal.withValues(alpha: 0.1),
                    child: Text("${i + 1}", style: TextStyle(fontSize: 12, color: teal)),
                  ),
                  title: Text(suppliedItems[i].name, style: text.titleSmall),
                  subtitle: Text(
                    "${_num(suppliedItems[i].quantity)} ${tr(suppliedItems[i].unit)}"
                    " · LKR ${suppliedItems[i].unitPrice.toStringAsFixed(2)}",
                  ),
                  trailing: IconButton(
                    tooltip: tr("Remove"),
                    icon: const Icon(Icons.close, color: KadeColors.terra),
                    onPressed: saving ? null : () => setState(() => suppliedItems.removeAt(i)),
                  ),
                ),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                "${tr("Total Available Quantity:")} ${_num(totalAvailable)}",
                style: text.titleSmall?.copyWith(color: teal),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
