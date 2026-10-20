import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../services/crud_service.dart';
import '../../core/i18n.dart';
import '../common/record_details.dart' show money, qtyOf;

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
  final costPriceCtrl = TextEditingController(); // Unit Cost
  final sellingPriceCtrl = TextEditingController(); // the price a sale suggests (0 / empty = not set)
  final leadTimeCtrl = TextEditingController();

  String? category;
  String? supplierName;
  String unit = "unit";
  List<String> supplierOptions = [];
  List<Map> suppliers = []; // full rows — items_supplied powers the item suggestions
  bool saving = false;
  bool loadingSuppliers = true;
  // Edit: the list row adds up all batches, but Update writes one batch (the newest), so the
  // form loads that batch itself (GET /inventory/:id) — same as the web edit page
  bool batchLoaded = false;
  int batchCount = 1;
  num totalQty = 0;
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
    leadTimeCtrl.text = it?["lead_time_days"]?.toString() ?? "1";
    supplierName = it?["supplier_name"]?.toString();
    unit = (it?["unit"]?.toString().isNotEmpty ?? false) ? it!["unit"].toString() : "unit";
    final sell = num.tryParse("${it?["selling_price"] ?? ""}") ?? 0;
    sellingPriceCtrl.text = sell > 0 ? "$sell" : "";
    batchCount = (it?["batch_count"] as num?)?.toInt() ?? 1;
    totalQty = (it?["quantity"] as num?) ?? 0;
    if (isEdit) _loadBatch();

    // listeners that keep Total Cost up to date
    costPriceCtrl.addListener(_recalc);
    quantityCtrl.addListener(_recalc);
    sellingPriceCtrl.addListener(_recalc);

    _loadSuppliers();
  }

  void _recalc() => setState(() {});

  Future<void> _loadBatch() async {
    try {
      final b = await Api.get("/inventory/${widget.item!["id"]}");
      if (!mounted || b is! Map) return;
      setState(() {
        quantityCtrl.text = "${b["quantity"] ?? ""}";
        reorderCtrl.text = "${b["reorder_level"] ?? ""}";
        costPriceCtrl.text = "${b["cost_price"] ?? b["unit_price"] ?? ""}";
        final sell = num.tryParse("${b["selling_price"] ?? ""}") ?? 0;
        sellingPriceCtrl.text = sell > 0 ? "$sell" : "";
        leadTimeCtrl.text = "${b["lead_time_days"] ?? 1}";
        batchLoaded = true;
      });
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    }
  }

  // ⚠ hint under the selling price
  String? get _sellWarning {
    final c = double.tryParse(costPriceCtrl.text.trim()) ?? 0;
    final s = double.tryParse(sellingPriceCtrl.text.trim()) ?? 0;
    if (s <= 0 || c <= 0) return null;
    if (s < c) return tr("⚠ Lower than the unit cost — this item would sell at a loss.");
    if (s == c) return tr("⚠ Same as the unit cost — no profit on this item.");
    return null;
  }

  Future<void> _loadSuppliers() async {
    try {
      final data = await Api.get("/suppliers");
      final rows = (data is List) ? data.whereType<Map>().toList() : <Map>[];
      final names = (data is List)
          ? data.map((e) => "${e["name"] ?? ""}").where((s) => s.isNotEmpty).toList()
          : <String>[];
      if (supplierName != null && supplierName!.isNotEmpty && !names.contains(supplierName)) {
        names.insert(0, supplierName!);
      }
      if (mounted) {
        setState(() {
          suppliers = rows;
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

  // Items the selected supplier carries ([{item_name, quantity, unit, unit_price}])
  List<Map> get _supplierItems {
    final sup = suppliers.where((s) => s["name"] == supplierName);
    final items = sup.isEmpty ? null : sup.first["items_supplied"];
    return (items is List) ? items.whereType<Map>().toList() : <Map>[];
  }

  // Picking one of the supplier's items fills in the name, cost and unit (same as the web form)
  void _useSupplierItem(Map it) {
    setState(() {
      nameCtrl.text = "${it["item_name"] ?? ""}";
      if (it["unit_price"] is num) costPriceCtrl.text = "${it["unit_price"]}";
      final u = "${it["unit"] ?? ""}";
      if (units.contains(u)) unit = u;
    });
  }

  @override
  void dispose() {
    costPriceCtrl.removeListener(_recalc);
    quantityCtrl.removeListener(_recalc);
    sellingPriceCtrl.removeListener(_recalc);
    sellingPriceCtrl.dispose();
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
    if (isEdit && !batchLoaded) {
      setState(() => error = tr("Still loading this item — try again in a moment."));
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
      "selling_price": num.tryParse(sellingPriceCtrl.text.trim()) ?? 0,
      "lead_time_days": num.tryParse(leadTimeCtrl.text.trim()) ?? 1, // safety-stock reorder point
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
      appBar: AppBar(title: Text(isEdit ? tr("Edit Inventory Item") : tr("Add Inventory Item"))),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],

            fieldLabel(tr("Supplier")),
            DropdownButtonFormField<String>(
              initialValue: supplierOptions.contains(supplierName) ? supplierName : null,
              isExpanded: true, // long supplier names overflowed the field
              hint: Text(
                loadingSuppliers
                    ? tr("Loading...")
                    : (supplierOptions.isEmpty ? tr("No suppliers available") : tr("Select a supplier")),
              ),
              items: supplierOptions
                  .map((o) => DropdownMenuItem(value: o, child: Text(o, overflow: TextOverflow.ellipsis)))
                  .toList(),
              onChanged: saving ? null : (v) => setState(() => supplierName = v),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Item Name *")),
            TextField(
              controller: nameCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(hintText: tr("e.g. Rice 5kg")),
            ),
            if (_supplierItems.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.only(top: 6, left: 2),
                child: Text(
                  "${tr("Suggested from")} $supplierName: ${tr("pick one to auto-fill cost & unit")}",
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
              Wrap(
                spacing: 6,
                children: [
                  for (final it in _supplierItems)
                    ActionChip(
                      label: Text("${it["item_name"] ?? ""}"),
                      onPressed: saving ? null : () => _useSupplierItem(it),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 16),

            fieldLabel(tr("Category *")),
            DropdownButtonFormField<String>(
              initialValue: (category != null && categoryOptions.contains(category)) ? category : null,
              hint: Text(tr("Select category…")),
              items: categoryOptions.map((o) => DropdownMenuItem(value: o, child: Text(tr(o)))).toList(),
              onChanged: saving ? null : (v) => setState(() => category = v),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 6, left: 2),
              child: Text(
                tr("Required for AI Demand Forecasting"),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Unit")),
            DropdownButtonFormField<String>(
              initialValue: units.contains(unit) ? unit : "unit",
              items: units.map((o) => DropdownMenuItem(value: o, child: Text(tr(o)))).toList(),
              onChanged: saving ? null : (v) => setState(() => unit = v ?? "unit"),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Initial Quantity")),
            TextField(
              controller: quantityCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: InputDecoration(
                hintText: "0",
                // several batches: this form edits the newest one only
                helperText: isEdit && batchCount > 1
                    ? "${tr("Newest batch")} · ${tr("total stock")} ${qtyOf(totalQty)} ($batchCount ${tr("batches")})"
                    : null,
              ),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Reorder Level")),
            TextField(
              controller: reorderCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: InputDecoration(
                hintText: tr("Default: Auto AI"),
                helperText: tr("Alert threshold (Auto-calculated by AI if empty)"),
              ),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Unit Cost per Unit (LKR)")),
            TextField(
              controller: costPriceCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: InputDecoration(hintText: "0.00", helperText: tr("Buying price per unit")),
            ),
            const SizedBox(height: 16),

            // Total Cost (read-only, calculated)
            fieldLabel(tr("Total Cost (LKR)")),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
              decoration: BoxDecoration(
                color: isDark ? Colors.white10 : KadeColors.surfaceMutedLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                money(_totalCost),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 6, left: 2),
              child: Text(
                "${tr("Unit Cost × Quantity")}  =  ${(double.tryParse(costPriceCtrl.text.trim()) ?? 0).toStringAsFixed(2)} × ${qtyOf(double.tryParse(quantityCtrl.text.trim()) ?? 0)}",
                style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color),
              ),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Selling Price per Unit (LKR)")),
            TextField(
              controller: sellingPriceCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: InputDecoration(
                hintText: "0.00",
                helperText: _sellWarning ?? tr("The price a sale suggests for this item"),
                helperStyle: _sellWarning != null ? const TextStyle(color: KadeColors.terra) : null,
                helperMaxLines: 2,
              ),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Item Delivery Lead Time (Days)")),
            TextField(
              controller: leadTimeCtrl,
              enabled: !saving,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                hintText: "1",
                helperText: tr("Expected delivery time (Used for Dynamic Safety Stock)"),
              ),
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
  child: Text(tr(t), style: const TextStyle(fontWeight: FontWeight.w700)),
);

Widget errorBox(String msg) => Container(
  margin: const EdgeInsets.only(bottom: 16),
  padding: const EdgeInsets.all(12),
  decoration: BoxDecoration(
    color: KadeColors.terra.withValues(alpha: 0.12),
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
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
  ),
);
