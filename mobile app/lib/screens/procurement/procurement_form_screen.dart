import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../services/crud_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;

// Cost basis for profit math = the selected supplier's unit_price. Change if yours differs.
class ProcurementFormScreen extends StatefulWidget {
  final Map<String, dynamic>? item;
  const ProcurementFormScreen({super.key, this.item});
  @override
  State<ProcurementFormScreen> createState() => _ProcurementFormScreenState();
}

class _ProcurementFormScreenState extends State<ProcurementFormScreen> {
  final service = CrudService("/procurement");
  final quantityCtrl = TextEditingController();
  final sellPriceCtrl = TextEditingController();
  final totalCostCtrl = TextEditingController();
  final profitCtrl = TextEditingController();
  String? itemName, supplierName, deliveryLocation, status = "pending";

  List<String> itemOptions = [];
  List<Map<String, dynamic>> suppliers = [];
  bool saving = false;
  String? error;

  static const districts = [
    "Colombo","Gampaha","Kalutara","Kandy","Matale","Nuwara Eliya","Galle","Matara",
    "Hambantota","Jaffna","Kilinochchi","Mannar","Vavuniya","Mullaitivu","Batticaloa",
    "Ampara","Trincomalee","Kurunegala","Puttalam","Anuradhapura","Polonnaruwa","Badulla",
    "Monaragala","Ratnapura","Kegalle",
  ];
  static const statuses = ["pending", "ordered", "received", "cancelled"];
  bool get isEdit => widget.item != null;

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    itemName = it?["item_name"]?.toString();
    supplierName = it?["selected_supplier_name"]?.toString();
    deliveryLocation = it?["delivery_location"]?.toString();
    status = it?["status"]?.toString() ?? "pending";
    quantityCtrl.text = it?["quantity"]?.toString() ?? "";
    sellPriceCtrl.text = it?["expected_selling_price"]?.toString() ?? "";
    totalCostCtrl.text = it?["total_cost"]?.toString() ?? "";
    profitCtrl.text = it?["estimated_profit"]?.toString() ?? "";
    _loadOptions();
  }

  Future<void> _loadOptions() async {
    try {
      final inv = await Api.get("/inventory");
      final sup = await Api.get("/suppliers");
      final names = (inv is List) ? inv.map((e) => "${e["name"] ?? ""}").where((s) => s.isNotEmpty).toList() : <String>[];
      final supObjs = (sup is List) ? sup.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : <Map<String, dynamic>>[];
      if (itemName != null && itemName!.isNotEmpty && !names.contains(itemName)) names.insert(0, itemName!);
      if (mounted) setState(() { itemOptions = names; suppliers = supObjs; });
    } catch (_) {
      if (mounted) setState(() { itemOptions = []; suppliers = []; });
    }
  }

  double get _supplierCost {
    final s = suppliers.firstWhere((x) => "${x["name"] ?? ""}" == supplierName, orElse: () => {});
    return double.tryParse("${s["unit_price"] ?? ""}") ?? 0;
  }

  // total_cost = qty × supplier cost ; profit = (sell − cost) × qty
  void _recalc() {
    final qty = double.tryParse(quantityCtrl.text.trim()) ?? 0;
    final sell = double.tryParse(sellPriceCtrl.text.trim()) ?? 0;
    final cost = _supplierCost;
    if (qty > 0 && cost > 0) {
      totalCostCtrl.text = (qty * cost).toStringAsFixed(2);
      if (sell > 0) profitCtrl.text = ((sell - cost) * qty).toStringAsFixed(2);
    }
    setState(() {});
  }

  @override
  void dispose() {
    quantityCtrl.dispose(); sellPriceCtrl.dispose(); totalCostCtrl.dispose(); profitCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (itemName == null || itemName!.isEmpty) { setState(() => error = "Item Name is required."); return; }
    if (quantityCtrl.text.trim().isEmpty) { setState(() => error = "Quantity is required."); return; }

    final payload = <String, dynamic>{
      "item_name": itemName,
      "quantity": num.tryParse(quantityCtrl.text.trim()) ?? 0,
      "status": status,
    };
    if (deliveryLocation != null) payload["delivery_location"] = deliveryLocation;
    if (supplierName != null) payload["selected_supplier_name"] = supplierName;
    if (sellPriceCtrl.text.trim().isNotEmpty) payload["expected_selling_price"] = num.tryParse(sellPriceCtrl.text.trim()) ?? 0;
    if (totalCostCtrl.text.trim().isNotEmpty) payload["total_cost"] = num.tryParse(totalCostCtrl.text.trim()) ?? 0;
    if (profitCtrl.text.trim().isNotEmpty) payload["estimated_profit"] = num.tryParse(profitCtrl.text.trim()) ?? 0;

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
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} Procurement")),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        if (error != null) errorBox(error!),
        fieldLabel("Item Name *"),
        DropdownButtonFormField<String>(
          initialValue: itemOptions.contains(itemName) ? itemName : null,
          hint: Text(itemOptions.isEmpty ? "No items yet" : "— Select —"),
          items: itemOptions.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
          onChanged: (v) => setState(() => itemName = v),
        ),
        const SizedBox(height: 16),
        fieldLabel("Quantity *"),
        TextField(controller: quantityCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(hintText: "0"), onChanged: (_) => _recalc()),
        const SizedBox(height: 16),
        fieldLabel("Delivery Location"),
        DropdownButtonFormField<String>(
          initialValue: districts.contains(deliveryLocation) ? deliveryLocation : null,
          hint: const Text("— Select —"),
          items: districts.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
          onChanged: (v) => setState(() => deliveryLocation = v),
        ),
        const SizedBox(height: 16),
        fieldLabel("Selected Supplier"),
        DropdownButtonFormField<String>(
          initialValue: suppliers.any((s) => "${s["name"]}" == supplierName) ? supplierName : null,
          hint: Text(suppliers.isEmpty ? "No suppliers yet" : "— Select —"),
          items: suppliers.map((s) => DropdownMenuItem(value: "${s["name"]}", child: Text("${s["name"]}"))).toList(),
          onChanged: (v) => setState(() { supplierName = v; _recalc(); }),
        ),
        const SizedBox(height: 16),
        fieldLabel("Expected Selling Price (LKR)"),
        TextField(controller: sellPriceCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(hintText: "0.00"), onChanged: (_) => _recalc()),
        const SizedBox(height: 16),
        fieldLabel("Total Cost (LKR)"),
        TextField(controller: totalCostCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(hintText: "Auto — editable")),
        const SizedBox(height: 16),
        fieldLabel("Estimated Profit (LKR)"),
        TextField(controller: profitCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(hintText: "Auto — editable")),
        const SizedBox(height: 16),
        fieldLabel("Status"),
        DropdownButtonFormField<String>(
          initialValue: status,
          items: statuses.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
          onChanged: (v) => setState(() => status = v ?? "pending"),
        ),
        const SizedBox(height: 24),
        saveButton(saving, isEdit, teal, _save),
      ]),
    );
  }
}