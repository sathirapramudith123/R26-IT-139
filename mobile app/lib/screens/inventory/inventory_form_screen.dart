import 'package:flutter/material.dart';
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
  final quantityCtrl = TextEditingController();
  final reorderCtrl = TextEditingController();
  final priceCtrl = TextEditingController();
  String? supplierName;
  String unit = "unit";
  List<String> supplierOptions = [];
  bool saving = false;
  String? error;

  static const units = ["kg", "g", "l", "ml", "unit", "box", "carton"];
  bool get isEdit => widget.item != null;

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    nameCtrl.text = it?["name"]?.toString() ?? "";
    quantityCtrl.text = it?["quantity"]?.toString() ?? "";
    reorderCtrl.text = it?["reorder_level"]?.toString() ?? "";
    priceCtrl.text = it?["unit_price"]?.toString() ?? "";
    supplierName = it?["supplier_name"]?.toString();
    unit = it?["unit"]?.toString() ?? "unit";
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
      if (mounted) setState(() => supplierOptions = names);
    } catch (_) {
      if (mounted) setState(() => supplierOptions = []);
    }
  }

  @override
  void dispose() {
    nameCtrl.dispose(); quantityCtrl.dispose(); reorderCtrl.dispose(); priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (nameCtrl.text.trim().isEmpty) { setState(() => error = "Item Name is required."); return; }
    if (quantityCtrl.text.trim().isEmpty) { setState(() => error = "Quantity is required."); return; }

    final payload = <String, dynamic>{
      "name": nameCtrl.text.trim(),
      "quantity": num.tryParse(quantityCtrl.text.trim()) ?? 0,
      "unit": unit,
    };
    if (supplierName != null && supplierName!.isNotEmpty) payload["supplier_name"] = supplierName;
    if (reorderCtrl.text.trim().isNotEmpty) payload["reorder_level"] = num.tryParse(reorderCtrl.text.trim()) ?? 0;
    if (priceCtrl.text.trim().isNotEmpty) payload["unit_price"] = num.tryParse(priceCtrl.text.trim()) ?? 0;

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
    return Scaffold(
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} Inventory")),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        if (error != null) errorBox(error!),
        fieldLabel("Item Name *"),
        TextField(controller: nameCtrl, decoration: const InputDecoration(hintText: "Item name")),
        const SizedBox(height: 16),
        fieldLabel("Supplier"),
        DropdownButtonFormField<String>(
          initialValue: supplierOptions.contains(supplierName) ? supplierName : null,
          hint: Text(supplierOptions.isEmpty ? "No suppliers yet" : "— Select —"),
          items: supplierOptions.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
          onChanged: (v) => setState(() => supplierName = v),
        ),
        const SizedBox(height: 16),
        fieldLabel("Quantity *"),
        TextField(controller: quantityCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: "0")),
        const SizedBox(height: 16),
        fieldLabel("Reorder Level"),
        TextField(controller: reorderCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: "0")),
        const SizedBox(height: 16),
        fieldLabel("Unit"),
        DropdownButtonFormField<String>(
          initialValue: unit,
          items: units.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
          onChanged: (v) => setState(() => unit = v ?? "unit"),
        ),
        const SizedBox(height: 16),
        fieldLabel("Unit Price (LKR)"),
        TextField(controller: priceCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: "0.00")),
        const SizedBox(height: 24),
        saveButton(saving, isEdit, teal, _save),
      ]),
    );
  }
}

// ── Shared little helpers (used by all four forms) ──
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