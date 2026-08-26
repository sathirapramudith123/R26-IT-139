import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../services/crud_service.dart';

const List<Map<String, String>> _txTypes = [
  {"value": "sale", "label": "Sale"},
  {"value": "purchase", "label": "Purchase"},
  {"value": "expense", "label": "Expense"},
  {"value": "deposit", "label": "Deposit"},
  {"value": "transfer", "label": "Transfer"},
];

const List<Map<String, String>> _payMethods = [
  {"value": "cash", "label": "Cash"},
  {"value": "bank", "label": "Bank"},
  {"value": "digital", "label": "Digital"},
];

const Map<String, Map<String, bool>> _typeConfig = {
  "sale": {"items": true},
  "purchase": {"items": true},
  "expense": {"category": true, "description": true},
  "deposit": {"category": true, "description": true},
  "transfer": {"category": true, "description": true},
};

// Web CATEGORIES_BY_TYPE — "Personal Drawings" සහ "Loan Disbursement" අයින් කළා.
const Map<String, List<String>> _categoriesByType = {
  "expense": [
    "Utilities (Electricity/Water)",
    "Rent",
    "Transport / Fuel",
    "Labor / Wages",
    "Loss / Wastage / Damage",
  ],
  "deposit": [
    "Agency Banking Cash-In",
    "Owner Capital Injection",
    "Other Income",
  ],
  "transfer": [
    "Agency Wallet Top-up",
    "Supplier Payment",
    "Inter-Bank Transfer",
  ],
};

class TransactionFormScreen extends StatefulWidget {
  final Map<String, dynamic>? item;
  final String? initialType;
  const TransactionFormScreen({super.key, this.item, this.initialType});

  @override
  State<TransactionFormScreen> createState() => _TransactionFormScreenState();
}

class _TransactionFormScreenState extends State<TransactionFormScreen> {
  final CrudService service = CrudService("/transactions");

  late String txType;
  late String paymentMethod;

  final amountCtrl = TextEditingController();
  final descriptionCtrl = TextEditingController();
  final qtyCtrl = TextEditingController();
  final priceCtrl = TextEditingController(); // NEW: per-unit price (typed)

  String? category;

  List<Map<String, dynamic>> inventory = [];
  final List<Map<String, dynamic>> cart = [];
  String? pickItem;

  bool saving = false;
  bool loadingInventory = true;
  String? error;

  bool get isEdit => widget.item != null;
  bool get usesItems => _typeConfig[txType]?["items"] == true;
  bool get isPurchase => txType == "purchase";
  bool get showCategory => _typeConfig[txType]?["category"] == true;
  bool get showDescription => _typeConfig[txType]?["description"] == true;

  double get cartTotal =>
      cart.fold(0.0, (s, l) => s + (l["amount"] as num).toDouble());

  // Payment method options: transfer -> cash නෑ | deposit -> cash විතරයි
  List<Map<String, String>> get _payOptions {
    if (txType == "transfer") return _payMethods.where((m) => m["value"] != "cash").toList();
    if (txType == "deposit") return _payMethods.where((m) => m["value"] == "cash").toList();
    return _payMethods;
  }

  List<String> get _categoryOptions {
    final base = List<String>.from(_categoriesByType[txType] ?? const []);
    if (category != null && category!.isNotEmpty && !base.contains(category)) {
      base.insert(0, category!);
    }
    return base;
  }

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    txType = (it?["transaction_type"] ?? widget.initialType ?? "sale").toString();
    paymentMethod = (it?["payment_method"] ?? "cash").toString();
    amountCtrl.text = it?["amount"]?.toString() ?? "";
    final c = it?["category"]?.toString();
    category = (c != null && c.isNotEmpty) ? c : null;
    descriptionCtrl.text = it?["description"]?.toString() ?? "";

    final saved = it?["items"];
    if (saved is List) {
      for (final l in saved) {
        if (l is Map) {
          final q = num.tryParse("${l["quantity"]}") ?? 0;
          final up = num.tryParse("${l["unit_price"]}") ?? 0;
          cart.add({
            "item_name": l["item_name"],
            "quantity": q,
            "unit_price": up,
            "cost_price": num.tryParse("${l["cost_price"]}") ?? 0,
            "amount": num.tryParse("${l["amount"]}") ?? (q * up),
          });
        }
      }
    }
    _enforcePayment();
    _loadInventory();
  }

  // inventory එකේ current cost (batch weighted avg) — purchase pre-fill / cost snapshot
  double _invCost(Map inv) =>
      double.tryParse("${inv["cost_price"] ?? inv["unit_price"] ?? inv["price"] ?? 0}") ?? 0.0;

  Future<void> _loadInventory() async {
    try {
      final data = await Api.get("/inventory");
      final objs = (data is List)
          ? data.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
          : <Map<String, dynamic>>[];
      if (!mounted) return;
      setState(() {
        inventory = objs;
        loadingInventory = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          inventory = [];
          loadingInventory = false;
        });
      }
    }
  }

  Map<String, dynamic> _findItem(String name) =>
      inventory.firstWhere((i) => "${i["name"] ?? ""}" == name, orElse: () => {});

  @override
  void dispose() {
    amountCtrl.dispose();
    descriptionCtrl.dispose();
    qtyCtrl.dispose();
    priceCtrl.dispose();
    super.dispose();
  }

  // Payment method rules
  void _enforcePayment() {
    if (txType == "deposit") {
      paymentMethod = "cash";
    } else if (txType == "transfer" && paymentMethod == "cash") {
      paymentMethod = _payMethods.firstWhere((m) => m["value"] != "cash")["value"]!;
    }
  }

  void _changeType(String? val) {
    if (val == null) return;
    FocusScope.of(context).unfocus();
    setState(() {
      txType = val;
      cart.clear();
      pickItem = null;
      qtyCtrl.clear();
      priceCtrl.clear();
      amountCtrl.clear();
      category = null;
      error = null;
      _enforcePayment();
    });
  }

  // Item pick කරද්දි: purchase -> inventory cost pre-fill | sale -> හිස්
  void _onPickItem(String? val) {
    setState(() {
      pickItem = val;
      if (val != null && isPurchase) {
        priceCtrl.text = _invCost(_findItem(val)).toStringAsFixed(2);
      } else {
        priceCtrl.clear();
      }
    });
  }

  void _addToCart() {
    FocusScope.of(context).unfocus();
    final name = pickItem;
    final units = double.tryParse(qtyCtrl.text.trim()) ?? 0;
    final price = double.tryParse(priceCtrl.text.trim()) ?? 0;

    if (name == null || name.isEmpty) {
      setState(() => error = "Select an item first.");
      return;
    }
    if (units <= 0) {
      setState(() => error = "Enter a valid quantity.");
      return;
    }
    if (price <= 0) {
      setState(() => error = isPurchase ? "Enter the cost price per unit." : "Enter the selling price per unit.");
      return;
    }

    final inv = _findItem(name);

    if (!isPurchase) {
      final stock = double.tryParse("${inv["quantity"] ?? ""}");
      final already = cart.where((l) => l["item_name"] == name)
          .fold(0.0, (s, l) => s + (l["quantity"] as num).toDouble());
      if (stock != null && units + already > stock) {
        setState(() => error = "Only ${stock.toStringAsFixed(0)} in stock"
            "${already > 0 ? " (${already.toStringAsFixed(0)} already added)" : ""}.");
        return;
      }
    }

    final costSnap = isPurchase ? price : _invCost(inv); // COGS snapshot
    setState(() {
      error = null;
      final idx = cart.indexWhere((l) => l["item_name"] == name);
      if (idx >= 0) {
        final q = (cart[idx]["quantity"] as num).toDouble() + units;
        final up = (cart[idx]["unit_price"] as num).toDouble();
        cart[idx]["quantity"] = q;
        cart[idx]["amount"] = double.parse((q * up).toStringAsFixed(2));
      } else {
        cart.add({
          "item_name": name,
          "quantity": units,
          "unit_price": price,       // sale: selling | purchase: cost
          "cost_price": costSnap,    // COGS snapshot
          "amount": double.parse((units * price).toStringAsFixed(2)),
        });
      }
      pickItem = null;
      qtyCtrl.clear();
      priceCtrl.clear();
    });
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

    // Payment method guard (web එකට ගැලපෙන්න)
    if (txType == "transfer" && paymentMethod == "cash") {
      setState(() => error = "Cash isn't allowed for Transfer transactions.");
      return;
    }
    if (txType == "deposit" && paymentMethod != "cash") {
      setState(() => error = "Deposit must be paid via Cash.");
      return;
    }

    final Map<String, dynamic> payload = {
      "transaction_type": txType,
      "payment_method": paymentMethod,
    };

    if (usesItems) {
      if (cart.isEmpty) {
        setState(() => error = "Add at least one item.");
        return;
      }
      payload["items"] = cart
          .map((l) => {
                "item_name": l["item_name"],
                "quantity": l["quantity"],
                "unit_price": l["unit_price"],
                "cost_price": l["cost_price"],
                "amount": l["amount"],
              })
          .toList();
      payload["amount"] = cartTotal;
    } else {
      final amt = double.tryParse(amountCtrl.text.trim()) ?? 0;
      if (amt <= 0) {
        setState(() => error = "Enter an amount greater than 0.");
        return;
      }
      if (showCategory && (category == null || category!.isEmpty)) {
        setState(() => error = "Please select a category.");
        return;
      }
      payload["amount"] = amt;
      if (showCategory && category != null && category!.isNotEmpty) {
        payload["category"] = category;
      }
      if (showDescription && descriptionCtrl.text.trim().isNotEmpty) {
        payload["description"] = descriptionCtrl.text.trim();
      }
    }

    setState(() { saving = true; error = null; });
    try {
      // Stock movement දැන් server FIFO එකෙන් — client-side update අයින් කළා
      if (isEdit) {
        await service.update("${widget.item!["id"]}", payload);
      } else {
        await service.create(payload);
      }
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final teal = isDark ? KadeColors.tealDark : KadeColors.teal;
    final payOpts = _payOptions;
    final payValue = payOpts.any((m) => m["value"] == paymentMethod) ? paymentMethod : payOpts.first["value"];

    return Scaffold(
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} Transaction")),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (error != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: KadeColors.terra.withOpacity(0.12), borderRadius: BorderRadius.circular(14)),
                child: Row(children: [
                  const Icon(Icons.error_outline, color: KadeColors.terra, size: 18),
                  const SizedBox(width: 8),
                  Expanded(child: Text(error!, style: const TextStyle(color: KadeColors.terra, fontSize: 13))),
                ]),
              ),

            _label("Transaction Type *"),
            DropdownButtonFormField<String>(
              value: _txTypes.any((t) => t["value"] == txType) ? txType : _txTypes.first["value"],
              items: _txTypes.map((t) => DropdownMenuItem(value: t["value"], child: Text(t["label"]!))).toList(),
              onChanged: saving ? null : _changeType,
            ),
            const SizedBox(height: 16),

            _label("Payment Method *"),
            DropdownButtonFormField<String>(
              value: payValue,
              items: payOpts.map((m) => DropdownMenuItem(value: m["value"], child: Text(m["label"]!))).toList(),
              onChanged: (saving || txType == "deposit") ? null : (val) => setState(() => paymentMethod = val ?? "cash"),
            ),
            if (txType == "transfer" || txType == "deposit")
              Padding(
                padding: const EdgeInsets.only(top: 6, left: 2),
                child: Text(
                  txType == "transfer" ? "Cash isn't available for transfers" : "Deposits are always Cash",
                  style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color),
                ),
              ),
            const SizedBox(height: 16),

            if (usesItems) ..._cartSection() else ..._simpleSection(),

            const SizedBox(height: 24),
            SizedBox(
              height: 52,
              child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: teal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999))),
                onPressed: saving ? null : _save,
                child: saving
                    ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : Text(isEdit ? "Update" : "Save", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(t, style: const TextStyle(fontWeight: FontWeight.w700, fontFamily: "Nunito")),
      );

  List<Widget> _simpleSection() {
    return [
      _label("Amount (LKR) *"),
      TextField(
        controller: amountCtrl,
        enabled: !saving,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
        decoration: const InputDecoration(hintText: "0.00", prefixText: "LKR "),
      ),
      if (showCategory) ...[
        const SizedBox(height: 16),
        _label("Category *"),
        DropdownButtonFormField<String>(
          value: _categoryOptions.contains(category) ? category : null,
          hint: const Text("Select category…"),
          items: _categoryOptions.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
          onChanged: saving ? null : (v) => setState(() => category = v),
        ),
      ],
      if (showDescription) ...[
        const SizedBox(height: 16),
        _label("Description"),
        TextField(
          controller: descriptionCtrl,
          enabled: !saving,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(hintText: "Optional notes"),
        ),
      ],
    ];
  }

  List<Widget> _cartSection() {
    final names = inventory.map((i) => "${i["name"] ?? ""}").where((s) => s.isNotEmpty).toList();
    final itemLabel = isPurchase ? "Item Purchased *" : "Item Sold *";
    final unitsLabel = isPurchase ? "Units bought" : "Units sold";
    final priceLabel = isPurchase ? "Cost Price per Unit (LKR)" : "Selling Price per Unit (LKR)";
    final priceHint = isPurchase ? "Auto-filled from inventory cost — editable" : "Enter your selling price per unit";

    return [
      _label(itemLabel),
      DropdownButtonFormField<String>(
        value: names.contains(pickItem) ? pickItem : null,
        hint: Text(loadingInventory ? "Loading..." : (names.isEmpty ? "No inventory items yet" : "Select an item…")),
        items: names.map((o) {
          final inv = _findItem(o);
          return DropdownMenuItem(value: o, child: Text("$o (${inv["quantity"] ?? 0} in stock)"));
        }).toList(),
        onChanged: saving ? null : _onPickItem,
      ),
      const SizedBox(height: 10),

      _label(unitsLabel),
      TextField(
        controller: qtyCtrl,
        enabled: !saving,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
        decoration: InputDecoration(hintText: unitsLabel),
      ),
      const SizedBox(height: 10),

      // NEW: per-unit price — purchase එකට cost, sale එකට selling price
      _label(priceLabel),
      TextField(
        controller: priceCtrl,
        enabled: !saving,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
        decoration: InputDecoration(hintText: "0.00", prefixText: "LKR ", helperText: priceHint),
      ),
      const SizedBox(height: 10),

      Align(
        alignment: Alignment.centerRight,
        child: FilledButton.tonal(
          onPressed: (pickItem == null || saving) ? null : _addToCart,
          child: const Text("+ Add item"),
        ),
      ),
      const SizedBox(height: 14),

      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.black.withOpacity(0.03), borderRadius: BorderRadius.circular(14)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(isPurchase ? "Items in this purchase" : "Items in this sale",
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            const SizedBox(height: 6),
            if (cart.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 6),
                child: Text("No items added yet.", style: TextStyle(fontSize: 12, color: Colors.grey)),
              )
            else
              ...cart.asMap().entries.map((e) {
                final i = e.key;
                final l = e.value;
                final q = (l["quantity"] as num);
                final up = (l["unit_price"] as num).toDouble();
                final amt = (l["amount"] as num).toDouble();
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("${l["item_name"]}", style: const TextStyle(fontWeight: FontWeight.w700)),
                          Text("${q.toString()} × LKR ${up.toStringAsFixed(2)}",
                              style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        ],
                      ),
                    ),
                    Text("LKR ${amt.toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.w700)),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: saving ? null : () => setState(() => cart.removeAt(i)),
                    ),
                  ]),
                );
              }),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("Total", style: TextStyle(fontWeight: FontWeight.w800)),
                Text("LKR ${cartTotal.toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.w800)),
              ],
            ),
          ],
        ),
      ),
    ];
  }
}