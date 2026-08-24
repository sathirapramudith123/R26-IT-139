import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../services/crud_service.dart';

class InventoryFormScreen extends StatefulWidget {
  final Map<String, dynamic>? item;
  const InventoryFormScreen({super.key, this.item});

  @override
  State<InventoryFormScreen> createState() => _InventoryFormScreenState();
}

class _InventoryFormScreenState extends State<InventoryFormScreen> {
  final service = CrudService("/inventory");
  final nameCtrl = TextEditingController();
  final categoryCtrl = TextEditingController();
  final quantityCtrl = TextEditingController();
  final initialQtyCtrl = TextEditingController();
  final reorderCtrl = TextEditingController();
  final priceCtrl = TextEditingController(); // Unit Price / Selling Price
  final costPriceCtrl = TextEditingController();
  final sellingPriceCtrl = TextEditingController();
  final leadTimeCtrl = TextEditingController();

  String? supplierName;
  String unit = "unit";
  List<String> supplierOptions = [];
  bool saving = false;
  bool loadingSuppliers = true;
  String? error;

  static const units = ["kg", "g", "l", "ml", "unit", "box", "carton"];
  bool get isEdit => widget.item != null;

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    nameCtrl.text = it?["name"]?.toString() ?? "";
    categoryCtrl.text = it?["category"]?.toString() ?? "";
    quantityCtrl.text = it?["quantity"]?.toString() ?? "";
    initialQtyCtrl.text = it?["initial_quantity"]?.toString() ?? it?["quantity"]?.toString() ?? "";
    reorderCtrl.text = it?["reorder_level"]?.toString() ?? "";
    
    // Price controls mapping
    final sellingP = it?["selling_price"]?.toString() ?? it?["unit_price"]?.toString() ?? "";
    priceCtrl.text = sellingP;
    sellingPriceCtrl.text = sellingP;
    costPriceCtrl.text = it?["cost_price"]?.toString() ?? "";
    
    leadTimeCtrl.text = it?["delivery_lead_time"]?.toString() ?? it?["lead_time"]?.toString() ?? "";
    supplierName = it?["supplier_name"]?.toString();
    unit = (it?["unit"]?.toString().isNotEmpty ?? false) ? it!["unit"].toString() : "unit";

    _loadSuppliers();
  }

  Future<void> _loadSuppliers() async {
    try {
      final data = await Api.get("/suppliers");
      final names = (data is List)
          ? data.map((e) => "${e["name"] ?? ""}").where((s) => s.isNotEmpty).toList()
          : <String>[];

      if (supplierName != null && supplierName!.isNotEmpty && !names.contains(supplierName)) {
        names.insert(0, supplierName!);
      }

      if (mounted) {
        setState(() {
          supplierOptions = names;
          loadingSuppliers = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          supplierOptions = [];
          loadingSuppliers = false;
        });
      }
    }
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    categoryCtrl.dispose();
    quantityCtrl.dispose();
    initialQtyCtrl.dispose();
    reorderCtrl.dispose();
    priceCtrl.dispose();
    costPriceCtrl.dispose();
    sellingPriceCtrl.dispose();
    leadTimeCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus(); // Close Keyboard

    if (nameCtrl.text.trim().isEmpty) {
      setState(() => error = "Item Name is required.");
      return;
    }

    final qty = num.tryParse(quantityCtrl.text.trim());
    if (quantityCtrl.text.trim().isEmpty || qty == null || qty < 0) {
      setState(() => error = "Please enter a valid Quantity.");
      return;
    }

    final sellingPrice = sellingPriceCtrl.text.trim().isNotEmpty
        ? (num.tryParse(sellingPriceCtrl.text.trim()) ?? 0)
        : (num.tryParse(priceCtrl.text.trim()) ?? 0);

    final payload = <String, dynamic>{
      "name": nameCtrl.text.trim(),
      "category": categoryCtrl.text.trim(),
      "quantity": qty,
      "initial_quantity": initialQtyCtrl.text.trim().isNotEmpty ? (num.tryParse(initialQtyCtrl.text.trim()) ?? qty) : qty,
      "unit": unit,
      "reorder_level": reorderCtrl.text.trim().isNotEmpty ? (num.tryParse(reorderCtrl.text.trim()) ?? 0) : 0,
      "unit_price": sellingPrice,
      "selling_price": sellingPrice,
      "cost_price": costPriceCtrl.text.trim().isNotEmpty ? (num.tryParse(costPriceCtrl.text.trim()) ?? 0) : 0,
      "delivery_lead_time": leadTimeCtrl.text.trim().isNotEmpty ? (int.tryParse(leadTimeCtrl.text.trim()) ?? 0) : 0,
    };

    if (supplierName != null && supplierName!.isNotEmpty) {
      payload["supplier_name"] = supplierName;
    }

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

    return Scaffold(
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} Inventory")),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (error != null) ...[
              errorBox(error!),
              const SizedBox(height: 12),
            ],

            fieldLabel("Item Name *"),
            TextField(
              controller: nameCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(hintText: "Enter item name"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Category"),
            TextField(
              controller: categoryCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(hintText: "e.g. Beverages, Electronics"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Supplier"),
            DropdownButtonFormField<String>(
              value: supplierOptions.contains(supplierName) ? supplierName : null,
              hint: Text(loadingSuppliers ? "Loading..." : (supplierOptions.isEmpty ? "No suppliers available" : "— Select Supplier —")),
              items: supplierOptions.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
              onChanged: saving ? null : (v) => setState(() => supplierName = v),
            ),
            const SizedBox(height: 16),

            fieldLabel("Quantity *"),
            TextField(
              controller: quantityCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0.00"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Initial Quantity"),
            TextField(
              controller: initialQtyCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "Initial stock count"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Reorder Level"),
            TextField(
              controller: reorderCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0.00"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Unit"),
            DropdownButtonFormField<String>(
              value: units.contains(unit) ? unit : "unit",
              items: units.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
              onChanged: saving ? null : (v) => setState(() => unit = v ?? "unit"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Cost Price per Unit (LKR)"),
            TextField(
              controller: costPriceCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0.00", prefixText: "LKR "),
            ),
            const SizedBox(height: 16),

            fieldLabel("Selling Price per Unit (LKR) *"),
            TextField(
              controller: sellingPriceCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0.00", prefixText: "LKR "),
            ),
            const SizedBox(height: 16),

            fieldLabel("Item Delivery Lead Time (Days)"),
            TextField(
              controller: leadTimeCtrl,
              enabled: !saving,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(hintText: "e.g. 3"),
            ),
            const SizedBox(height: 28),

            saveButton(saving, isEdit, teal, _save),
          ],
        ),
      ),
    );
  }
}

// ── Shared Helper Widgets ──
Widget fieldLabel(String t) => Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(t, style: const TextStyle(fontWeight: FontWeight.w700, fontFamily: "Nunito")),
    );

Widget errorBox(String msg) => Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: KadeColors.terra.withOpacity(0.12), borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        const Icon(Icons.error_outline, color: KadeColors.terra, size: 18),
        const SizedBox(width: 8),
        Expanded(child: Text(msg, style: const TextStyle(color: KadeColors.terra, fontSize: 13))),
      ]),
    );

Widget saveButton(bool saving, bool isEdit, Color teal, VoidCallback onSave) => SizedBox(
      height: 52,
      child: FilledButton(
        style: FilledButton.styleFrom(backgroundColor: teal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999))),
        onPressed: saving ? null : onSave,
        child: saving
            ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
            : Text(isEdit ? "Update" : "Save", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
      ),
    );