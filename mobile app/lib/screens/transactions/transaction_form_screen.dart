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
  "deposit": {"description": true},
  "transfer": {"description": true},
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
  final CrudService inventoryService = CrudService("/inventory");

  late String txType;
  late String paymentMethod;

  final amountCtrl = TextEditingController();
  final categoryCtrl = TextEditingController();
  final descriptionCtrl = TextEditingController();
  final qtyCtrl = TextEditingController();

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

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    txType = (it?["transaction_type"] ?? widget.initialType ?? "sale").toString();
    paymentMethod = (it?["payment_method"] ?? "cash").toString();
    amountCtrl.text = it?["amount"]?.toString() ?? "";
    categoryCtrl.text = it?["category"]?.toString() ?? "";
    descriptionCtrl.text = it?["description"]?.toString() ?? "";

    final saved = it?["items"];
    if (saved is List) {
      for (final l in saved) {
        if (l is Map) {
          cart.add({
            "item_name": l["item_name"],
            "quantity": num.tryParse("${l["quantity"]}") ?? 0,
            "unit_price": 0,
            "amount": 0,
          });
        }
      }
    }
    _loadInventory();
  }

  double _getPrice(Map<String, dynamic> inv) {
    final raw = isPurchase
        ? (inv["cost_price"] ?? inv["price"] ?? inv["unit_price"])
        : (inv["selling_price"] ?? inv["price"] ?? inv["unit_price"]);
    return double.tryParse("$raw") ?? 0.0;
  }

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
        for (final l in cart) {
          if ((l["unit_price"] as num) == 0) {
            final inv = _findItem("${l["item_name"]}");
            final price = _getPrice(inv);
            final q = (l["quantity"] as num).toDouble();
            l["unit_price"] = price;
            l["amount"] = double.parse((q * price).toStringAsFixed(2));
          }
        }
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
    categoryCtrl.dispose();
    descriptionCtrl.dispose();
    qtyCtrl.dispose();
    super.dispose();
  }

  void _changeType(String? val) {
    if (val == null) return;
    FocusScope.of(context).unfocus();
    setState(() {
      txType = val;
      cart.clear();
      pickItem = null;
      qtyCtrl.clear();
      amountCtrl.clear();
      error = null;
    });
  }

  void _addToCart() {
    FocusScope.of(context).unfocus();
    final name = pickItem;
    final units = double.tryParse(qtyCtrl.text.trim()) ?? 0;
    
    if (name == null || name.isEmpty) {
      setState(() => error = "Select an item first.");
      return;
    }
    if (units <= 0) {
      setState(() => error = "Enter a valid quantity.");
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

    final price = _getPrice(inv);
    setState(() {
      error = null;
      final idx = cart.indexWhere((l) => l["item_name"] == name);
      if (idx >= 0) {
        final q = (cart[idx]["quantity"] as num).toDouble() + units;
        cart[idx]["quantity"] = q;
        cart[idx]["amount"] = double.parse((q * price).toStringAsFixed(2));
      } else {
        cart.add({
          "item_name": name,
          "quantity": units,
          "unit_price": price,
          "amount": double.parse((units * price).toStringAsFixed(2)),
        });
      }
      pickItem = null;
      qtyCtrl.clear();
    });
  }

  Future<void> _updateInventoryStock() async {
    if (!usesItems || cart.isEmpty) return;

    for (final line in cart) {
      final inv = _findItem("${line["item_name"]}");
      if (inv.isNotEmpty && inv["id"] != null) {
        final currentQty = double.tryParse("${inv["quantity"] ?? 0}") ?? 0.0;
        final cartQty = (line["quantity"] as num).toDouble();
        
        final newQty = isPurchase 
            ? currentQty + cartQty 
            : currentQty - cartQty;

        try {
          final updatedData = Map<String, dynamic>.from(inv);
          updatedData["quantity"] = newQty < 0 ? 0 : newQty;
          await inventoryService.update("${inv["id"]}", updatedData);
        } catch (e) {
          debugPrint("Failed to update stock for ${line["item_name"]}: $e");
        }
      }
    }
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

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
          .map((l) => {"item_name": l["item_name"], "quantity": l["quantity"]})
          .toList();
      payload["amount"] = cartTotal;
    } else {
      final amt = double.tryParse(amountCtrl.text.trim()) ?? 0;
      if (amt <= 0) {
        setState(() => error = "Enter an amount greater than 0.");
        return;
      }
      payload["amount"] = amt;
      if (showCategory && categoryCtrl.text.trim().isNotEmpty) {
        payload["category"] = categoryCtrl.text.trim();
      }
      if (showDescription && descriptionCtrl.text.trim().isNotEmpty) {
        payload["description"] = descriptionCtrl.text.trim();
      }
    }

    setState(() { saving = true; error = null; });
    try {
      if (isEdit) {
        await service.update("${widget.item!["id"]}", payload);
      } else {
        await service.create(payload);
        await _updateInventoryStock();
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
              value: _payMethods.any((m) => m["value"] == paymentMethod) ? paymentMethod : _payMethods.first["value"],
              items: _payMethods.map((m) => DropdownMenuItem(value: m["value"], child: Text(m["label"]!))).toList(),
              onChanged: saving ? null : (val) => setState(() => paymentMethod = val ?? "cash"),
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
        _label("Category"),
        TextField(
          controller: categoryCtrl,
          enabled: !saving,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(hintText: "e.g. utilities, rent"),
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

    return [
      _label(itemLabel),
      DropdownButtonFormField<String>(
        value: names.contains(pickItem) ? pickItem : null,
        hint: Text(loadingInventory ? "Loading..." : (names.isEmpty ? "No inventory items yet" : "Select an item…")),
        items: names.map((o) {
          final inv = _findItem(o);
          return DropdownMenuItem(value: o, child: Text("$o (${inv["quantity"] ?? 0} in stock)"));
        }).toList(),
        onChanged: saving ? null : (val) => setState(() => pickItem = val),
      ),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(
          child: TextField(
            controller: qtyCtrl,
            enabled: !saving,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
            decoration: InputDecoration(hintText: unitsLabel),
          ),
        ),
        const SizedBox(width: 10),
        FilledButton.tonal(
          onPressed: (pickItem == null || saving) ? null : _addToCart,
          child: const Text("Add"),
        ),
      ]),
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