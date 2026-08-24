import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../services/crud_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;

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
  bool loadingData = true;
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
    status = (it?["status"]?.toString().isNotEmpty ?? false) ? it!["status"].toString() : "pending";
    
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
      
      if (itemName != null && itemName!.isNotEmpty && !names.contains(itemName)) {
        names.insert(0, itemName!);
      }
      
      if (mounted) {
        setState(() {
          itemOptions = names;
          suppliers = supObjs;
          loadingData = false;
        });
        _recalc();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          itemOptions = [];
          suppliers = [];
          loadingData = false;
        });
      }
    }
  }

  double get _supplierCost {
    final s = suppliers.firstWhere((x) => "${x["name"] ?? ""}" == supplierName, orElse: () => {});
    return double.tryParse("${s["unit_price"] ?? ""}") ?? 0;
  }

  void _recalc() {
    final qty = double.tryParse(quantityCtrl.text.trim()) ?? 0;
    final sell = double.tryParse(sellPriceCtrl.text.trim()) ?? 0;
    final cost = _supplierCost;

    if (qty > 0 && cost > 0) {
      totalCostCtrl.text = (qty * cost).toStringAsFixed(2);
      if (sell > 0) {
        profitCtrl.text = ((sell - cost) * qty).toStringAsFixed(2);
      }
    }
  }

  String _capitalize(String str) {
    if (str.isEmpty) return "";
    return str[0].toUpperCase() + str.substring(1);
  }

  @override
  void dispose() {
    quantityCtrl.dispose();
    sellPriceCtrl.dispose();
    totalCostCtrl.dispose();
    profitCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus(); // Dismiss keyboard

    if (itemName == null || itemName!.isEmpty) {
      setState(() => error = "Item Name is required.");
      return;
    }
    
    final qty = num.tryParse(quantityCtrl.text.trim());
    if (quantityCtrl.text.trim().isEmpty || qty == null || qty <= 0) {
      setState(() => error = "Please enter a valid Quantity.");
      return;
    }

    final payload = <String, dynamic>{
      "item_name": itemName,
      "quantity": qty,
      "status": status,
      "delivery_location": deliveryLocation ?? "",
      "selected_supplier_name": supplierName ?? "",
      "expected_selling_price": sellPriceCtrl.text.trim().isNotEmpty ? (num.tryParse(sellPriceCtrl.text.trim()) ?? 0) : 0,
      "total_cost": totalCostCtrl.text.trim().isNotEmpty ? (num.tryParse(totalCostCtrl.text.trim()) ?? 0) : 0,
      "estimated_profit": profitCtrl.text.trim().isNotEmpty ? (num.tryParse(profitCtrl.text.trim()) ?? 0) : 0,
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

    return Scaffold(
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} Procurement")),
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
            DropdownButtonFormField<String>(
              value: itemOptions.contains(itemName) ? itemName : null,
              hint: Text(loadingData ? "Loading..." : (itemOptions.isEmpty ? "No inventory items" : "— Select Item —")),
              items: itemOptions.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
              onChanged: saving ? null : (v) => setState(() => itemName = v),
            ),
            const SizedBox(height: 16),

            fieldLabel("Quantity *"),
            TextField(
              controller: quantityCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0.00"),
              onChanged: (_) => setState(() => _recalc()),
            ),
            const SizedBox(height: 16),

            fieldLabel("Delivery Location"),
            DropdownButtonFormField<String>(
              value: districts.contains(deliveryLocation) ? deliveryLocation : null,
              hint: const Text("— Select District —"),
              items: districts.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
              onChanged: saving ? null : (v) => setState(() => deliveryLocation = v),
            ),
            const SizedBox(height: 16),

            fieldLabel("Selected Supplier"),
            DropdownButtonFormField<String>(
              value: suppliers.any((s) => "${s["name"]}" == supplierName) ? supplierName : null,
              hint: Text(loadingData ? "Loading..." : (suppliers.isEmpty ? "No suppliers available" : "— Select Supplier —")),
              items: suppliers.map((s) => DropdownMenuItem(value: "${s["name"]}", child: Text("${s["name"]}"))).toList(),
              onChanged: saving ? null : (v) {
                setState(() {
                  supplierName = v;
                  _recalc();
                });
              },
            ),
            const SizedBox(height: 16),

            fieldLabel("Expected Selling Price (LKR)"),
            TextField(
              controller: sellPriceCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0.00", prefixText: "LKR "),
              onChanged: (_) => setState(() => _recalc()),
            ),
            const SizedBox(height: 16),

            fieldLabel("Total Cost (LKR)"),
            TextField(
              controller: totalCostCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "Auto-calculated", prefixText: "LKR "),
            ),
            const SizedBox(height: 16),

            fieldLabel("Estimated Profit (LKR)"),
            TextField(
              controller: profitCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "Auto-calculated", prefixText: "LKR "),
            ),
            const SizedBox(height: 16),

            fieldLabel("Status"),
            DropdownButtonFormField<String>(
              value: statuses.contains(status) ? status : "pending",
              items: statuses.map((o) => DropdownMenuItem(value: o, child: Text(_capitalize(o)))).toList(),
              onChanged: saving ? null : (v) => setState(() => status = v ?? "pending"),
            ),
            const SizedBox(height: 28),

            saveButton(saving, isEdit, teal, _save),
          ],
        ),
      ),
    );
  }
}