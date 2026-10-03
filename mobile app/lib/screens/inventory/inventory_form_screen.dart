import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../services/crud_service.dart';
import '../../core/i18n.dart';

// Standardized categories (mirror web ITEM_CATEGORIES) — feed the AI model.
const List<String> kItemCategories = [
  "Rice & Grains",
  "Beverages",
  "Dairy & Bakery",
  "Snacks & Sweets",
  "Canned & Packaged Food",
  "Household & Cleaning",
  "Personal Care",
  "Spices & Cooking Essentials",
  "Other",
];

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
  final costPriceCtrl = TextEditingController(); // Unit Cost (no separate selling price)
  final leadTimeCtrl = TextEditingController();

  String? category;
  String? supplierName;
  String unit = "unit";
  List<String> supplierOptions = [];
  bool saving = false;
  bool loadingSuppliers = true;
  String? error;

  static const units = ["kg", "g", "l", "ml", "unit", "box", "carton"];
  bool get isEdit => widget.item != null;

  // Total Cost = Unit Cost × Quantity (live)
  double get _totalCost {
    final c = double.tryParse(costPriceCtrl.text.trim()) ?? 0;
    final q = double.tryParse(quantityCtrl.text.trim()) ?? 0;
    return c * q;
  }

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    nameCtrl.text = it?["name"]?.toString() ?? "";
    final c = it?["category"]?.toString();
    category = (c != null && c.isNotEmpty) ? c : null;
    quantityCtrl.text = it?["quantity"]?.toString() ?? "";
    reorderCtrl.text = it?["reorder_level"]?.toString() ?? "";
    costPriceCtrl.text = it?["cost_price"]?.toString() ?? it?["unit_price"]?.toString() ?? "";
    leadTimeCtrl.text = it?["delivery_lead_time"]?.toString() ?? it?["lead_time"]?.toString() ?? "";
    supplierName = it?["supplier_name"]?.toString();
    unit = (it?["unit"]?.toString().isNotEmpty ?? false) ? it!["unit"].toString() : "unit";

    // listeners that keep Total Cost up to date
    costPriceCtrl.addListener(_recalc);
    quantityCtrl.addListener(_recalc);

    _loadSuppliers();
  }

  void _recalc() => setState(() {});

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
    costPriceCtrl.removeListener(_recalc);
    quantityCtrl.removeListener(_recalc);
    nameCtrl.dispose();
    quantityCtrl.dispose();
    reorderCtrl.dispose();
    costPriceCtrl.dispose();
    leadTimeCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

    if (nameCtrl.text.trim().isEmpty) {
      setState(() => error = tr("Item Name is required."));
      return;
    }
    if (category == null || category!.isEmpty) {
      setState(() => error = tr("Please select a category (needed for AI forecasting)."));
      return;
    }
    final qty = num.tryParse(quantityCtrl.text.trim());
    if (quantityCtrl.text.trim().isEmpty || qty == null || qty < 0) {
      setState(() => error = tr("Please enter a valid Quantity."));
      return;
    }

    final costPrice = costPriceCtrl.text.trim().isNotEmpty
        ? (num.tryParse(costPriceCtrl.text.trim()) ?? 0)
        : 0;

    final payload = <String, dynamic>{
      "name": nameCtrl.text.trim(),
      "category": category,
      "quantity": qty,
      "unit": unit,
      "reorder_level": reorderCtrl.text.trim().isNotEmpty ? (num.tryParse(reorderCtrl.text.trim()) ?? 0) : 0,
      "cost_price": costPrice, // cost only (backend sets unit_price = cost)
      "delivery_lead_time": leadTimeCtrl.text.trim().isNotEmpty
          ? (int.tryParse(leadTimeCtrl.text.trim()) ?? 1)
          : 1,
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final categoryOptions = [...kItemCategories];
    if (category != null && category!.isNotEmpty && !categoryOptions.contains(category)) {
      categoryOptions.insert(0, category!);
    }

    return Scaffold(
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} Inventory")),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],

            fieldLabel(tr("Item Name *")),
            TextField(
              controller: nameCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(hintText: tr("Enter item name")),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Category *")),
            DropdownButtonFormField<String>(
              value: (category != null && categoryOptions.contains(category)) ? category : null,
              hint: Text(tr("Select category…")),
              items: categoryOptions.map((o) => DropdownMenuItem(value: o, child: Text(tr(o)))).toList(),
              onChanged: saving ? null : (v) => setState(() => category = v),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 6, left: 2),
              child: Text(
                tr("Required for AI demand forecasting"),
                style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color),
              ),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Supplier")),
            DropdownButtonFormField<String>(
              value: supplierOptions.contains(supplierName) ? supplierName : null,
              hint: Text(
                loadingSuppliers
                    ? tr("Loading...")
                    : (supplierOptions.isEmpty ? "No suppliers available" : "— Select Supplier —"),
              ),
              items: supplierOptions.map((o) => DropdownMenuItem(value: o, child: Text(tr(o)))).toList(),
              onChanged: saving ? null : (v) => setState(() => supplierName = v),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Quantity *")),
            TextField(
              controller: quantityCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0.00"),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Reorder Level")),
            TextField(
              controller: reorderCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: InputDecoration(hintText: tr("Leave blank for auto (AI)")),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Unit")),
            DropdownButtonFormField<String>(
              value: units.contains(unit) ? unit : "unit",
              items: units.map((o) => DropdownMenuItem(value: o, child: Text(tr(o)))).toList(),
              onChanged: saving ? null : (v) => setState(() => unit = v ?? "unit"),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Unit Cost per Unit (LKR)")),
            TextField(
              controller: costPriceCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: InputDecoration(hintText: "0.00", prefixText: tr("LKR ")),
            ),
            const SizedBox(height: 16),

            // Total Cost (read-only, calculated)
            fieldLabel(tr("Total Cost (LKR)")),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
              decoration: BoxDecoration(
                color: isDark ? Colors.white10 : const Color(0xFFF3ECE0),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                "LKR ${_totalCost.toStringAsFixed(2)}",
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 6, left: 2),
              child: Text(
                "Unit Cost × Quantity  =  ${(double.tryParse(costPriceCtrl.text.trim()) ?? 0).toStringAsFixed(2)} × ${(double.tryParse(quantityCtrl.text.trim()) ?? 0).toStringAsFixed(0)}",
                style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color),
              ),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Item Delivery Lead Time (Days)")),
            TextField(
              controller: leadTimeCtrl,
              enabled: !saving,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(hintText: tr("e.g. 3 (used for safety stock)")),
            ),
            const SizedBox(height: 28),

            saveButton(saving, isEdit, teal, _save),
          ],
        ),
      ),
    );
  }
}

// ── Shared helper widgets (also used by supplier_form_screen) ──
Widget fieldLabel(String t) => Padding(
  padding: const EdgeInsets.only(bottom: 6),
  child: Text(
    tr(t),
    style: const TextStyle(fontWeight: FontWeight.w700, fontFamily: "Nunito"),
  ),
);

Widget errorBox(String msg) => Container(
  margin: const EdgeInsets.only(bottom: 16),
  padding: const EdgeInsets.all(12),
  decoration: BoxDecoration(
    color: KadeColors.terra.withOpacity(0.12),
    borderRadius: BorderRadius.circular(14),
  ),
  child: Row(
    children: [
      const Icon(Icons.error_outline, color: KadeColors.terra, size: 18),
      const SizedBox(width: 8),
      Expanded(
        child: Text(tr(msg), style: const TextStyle(color: KadeColors.terra, fontSize: 13)),
      ),
    ],
  ),
);

Widget saveButton(bool saving, bool isEdit, Color teal, VoidCallback onSave) => SizedBox(
  height: 52,
  child: FilledButton(
    style: FilledButton.styleFrom(
      backgroundColor: teal,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
    ),
    onPressed: saving ? null : onSave,
    child: saving
        ? const SizedBox(
            height: 22,
            width: 22,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
          )
        : Text(
            isEdit ? tr("Update") : tr("Save"),
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, fontFamily: "Nunito"),
          ),
  ),
);
