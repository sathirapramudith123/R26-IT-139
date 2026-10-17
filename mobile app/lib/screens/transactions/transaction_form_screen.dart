import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../services/crud_service.dart';
import '../../core/i18n.dart';
import '../common/record_details.dart' show money, qtyOf;
import '../../core/price_hints.dart';

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

// Same categories per type as the web app (CATEGORIES_BY_TYPE).
const Map<String, List<String>> _categoriesByType = {
  "expense": [
    "Utilities (Electricity/Water)",
    "Rent",
    "Transport / Fuel",
    "Labor / Wages",
    "Loss / Wastage / Damage",
  ],
  "deposit": ["Agency Banking Cash-In", "Owner Capital Injection", "Other Income"],
  "transfer": ["Agency Wallet Top-up", "Supplier Payment", "Inter-Bank Transfer"],
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
  final sellingCtrl = TextEditingController(); // purchase: selling price / MRP of the new batch

  String? category;
  String? supplierName; // Supplier Payment: the supplier paid
  Map? balances; // {payments_tracked, suppliers:[{supplier_name, received, on_order, paid, outstanding}]}

  List<Map<String, dynamic>> inventory = [];
  // per item (priceKey): {last_sale, batches} — see core/price_hints.dart
  Map<String, Map> priceHints = {};
  final List<Map<String, dynamic>> cart = [];
  String? pickItem;

  bool saving = false;
  bool loadingInventory = true;
  String? error;

  bool get isEdit => widget.item != null;
  bool get usesItems => _typeConfig[txType]?["items"] == true;
  bool get isPurchase => txType == "purchase";
  bool get showCategory => _typeConfig[txType]?["category"] == true;
  bool get isSupplierPayment => txType == "transfer" && category == "Supplier Payment";
  bool get showDescription => _typeConfig[txType]?["description"] == true;

  double get cartTotal => cart.fold(0.0, (s, l) => s + (l["amount"] as num).toDouble());

  // Payment method options: transfer -> no cash | deposit -> cash only
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
    final sn = it?["supplier_name"]?.toString();
    supplierName = (sn != null && sn.isNotEmpty) ? sn : null;
    if (isSupplierPayment) _loadBalances();
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
            "selling_price": num.tryParse("${l["selling_price"]}") ?? 0,
            "amount": num.tryParse("${l["amount"]}") ?? (q * up),
          });
        }
      }
    }
    _enforcePayment();
    _loadInventory();
    _loadPriceHints();
  }

  // current inventory cost (batch weighted average) — purchase pre-fill / cost snapshot
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

  // Price hints (last sale + FIFO batches) to pre-fill prices; no suggestion if it fails
  Future<void> _loadPriceHints() async {
    try {
      final data = await Api.get("/transactions/price-hints");
      if (!mounted || data is! Map) return;
      setState(() {
        priceHints = {
          for (final e in data.entries)
            if (e.value is Map) "${e.key}": e.value as Map,
        };
      });
    } catch (_) {}
  }

  // the item's price hint, less the cart lines (they come out of stock first: same-price batch,
  // then FIFO). When editing, the saved lines were already taken out of stock, so they do not count.
  // What each supplier is owed: received orders − Supplier Payments (loaded once, when needed)
  Future<void> _loadBalances() async {
    if (balances != null) return;
    try {
      final data = await Api.get("/suppliers/balances");
      if (mounted) {
        setState(() => balances = data is Map ? data : {"payments_tracked": false, "suppliers": []});
      }
    } catch (_) {
      if (mounted) setState(() => balances = {"payments_tracked": false, "suppliers": []});
    }
  }

  List<Map> get _supplierRows =>
      (balances?["suppliers"] is List) ? (balances!["suppliers"] as List).whereType<Map>().toList() : <Map>[];

  // the chosen supplier's balance; when editing, this payment is already counted in "paid"
  Map? get _owed {
    final r = _supplierRows.where((s) => s["supplier_name"] == supplierName).firstOrNull;
    if (r == null) return null;
    final it = widget.item;
    if (isEdit && it?["supplier_name"] == supplierName) {
      final a = double.tryParse("${it?["amount"]}") ?? 0;
      return {
        ...r,
        "paid": ((r["paid"] as num?) ?? 0) - a,
        "outstanding": ((r["outstanding"] as num?) ?? 0) + a,
      };
    }
    return r;
  }

  Map? _hint(String? name) {
    if (name == null) return null;
    final byPrice = <double, double>{};
    void add(Iterable lines, double sign) {
      for (final l in lines.whereType<Map>().where((l) => l["item_name"] == name)) {
        final p = double.tryParse("${l["unit_price"]}") ?? 0;
        byPrice[p] = (byPrice[p] ?? 0) + sign * (double.tryParse("${l["quantity"]}") ?? 0);
      }
    }

    add(cart, 1);
    if (isEdit && widget.item?["items"] is List) add(widget.item!["items"] as List, -1);
    final lines = [
      for (final e in byPrice.entries)
        if (e.value > 0) (quantity: e.value, unitPrice: e.key),
    ];
    return afterCart(priceHints[priceKey(name)], lines);
  }

  Map<String, dynamic> _findItem(String name) =>
      inventory.firstWhere((i) => "${i["name"] ?? ""}" == name, orElse: () => {});

  @override
  void dispose() {
    amountCtrl.dispose();
    descriptionCtrl.dispose();
    qtyCtrl.dispose();
    priceCtrl.dispose();
    sellingCtrl.dispose();
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
      sellingCtrl.clear();
      amountCtrl.clear();
      category = null;
      error = null;
      _enforcePayment();
    });
  }

  // picking an item: purchase -> pre-fill inventory cost (+ newest selling price as the batch MRP)
  // sale -> the oldest batch's selling price, else the last price it was sold at. All editable.
  void _onPickItem(String? val) {
    setState(() {
      pickItem = val;
      final hint = _hint(val);
      sellingCtrl.clear();
      if (val != null && isPurchase) {
        priceCtrl.text = _invCost(_findItem(val)).toStringAsFixed(2);
        final mrp = purchaseSellingPrice(hint);
        if (mrp != null) sellingCtrl.text = mrp.toStringAsFixed(2);
      } else if (val != null && saleSuggestion(hint).price != null) {
        priceCtrl.text = saleSuggestion(hint).price!.toStringAsFixed(2);
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
      setState(() => error = tr("Select an item first."));
      return;
    }
    if (units <= 0) {
      setState(() => error = tr("Enter a valid quantity."));
      return;
    }
    if (price <= 0) {
      setState(
        () => error = isPurchase
            ? tr("Enter the cost price per unit.")
            : tr("Enter the selling price per unit."),
      );
      return;
    }

    final inv = _findItem(name);

    if (!isPurchase) {
      final stock = double.tryParse("${inv["quantity"] ?? ""}");
      final already = cart
          .where((l) => l["item_name"] == name)
          .fold(0.0, (s, l) => s + (l["quantity"] as num).toDouble());
      if (stock != null && units + already > stock) {
        setState(
          () => error =
              "Only ${qtyOf(stock)} in stock"
              "${already > 0 ? " (${qtyOf(already)} already added)" : ""}.",
        );
        return;
      }
    }

    final costSnap = isPurchase ? price : _invCost(inv); // COGS snapshot
    final mrp = double.tryParse(sellingCtrl.text.trim()) ?? 0;
    // a sale at the oldest batch's price is split over the batches (FIFO): 8 units with 5 left at
    // 240 -> 5 × 240 + 3 × 260. Lines with the same item and price are merged.
    final parts = isPurchase
        ? [(quantity: units, unitPrice: price)]
        : splitByBatch(_hint(name), units, price);
    setState(() {
      error = null;
      for (final part in parts) {
        final idx = cart.indexWhere(
          (l) => l["item_name"] == name && (l["unit_price"] as num).toDouble() == part.unitPrice,
        );
        if (idx >= 0) {
          final q = (cart[idx]["quantity"] as num).toDouble() + part.quantity;
          cart[idx]["quantity"] = q;
          cart[idx]["amount"] = double.parse((q * part.unitPrice).toStringAsFixed(2));
        } else {
          cart.add({
            "item_name": name,
            "quantity": part.quantity,
            "unit_price": part.unitPrice, // sale: selling | purchase: cost
            "cost_price": costSnap, // COGS snapshot
            if (isPurchase && mrp > 0) "selling_price": mrp, // batch MRP
            "amount": double.parse((part.quantity * part.unitPrice).toStringAsFixed(2)),
          });
        }
      }
      pickItem = null;
      qtyCtrl.clear();
      priceCtrl.clear();
      sellingCtrl.clear();
    });
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

    // Payment method guard (same rules as the web app)
    if (txType == "transfer" && paymentMethod == "cash") {
      setState(() => error = tr("Cash isn't allowed for Transfer transactions."));
      return;
    }
    if (txType == "deposit" && paymentMethod != "cash") {
      setState(() => error = tr("Deposit must be paid via Cash."));
      return;
    }

    final Map<String, dynamic> payload = {"transaction_type": txType, "payment_method": paymentMethod};

    if (usesItems) {
      if (cart.isEmpty) {
        setState(() => error = tr("Add at least one item."));
        return;
      }
      payload["items"] = cart
          .map(
            (l) => {
              "item_name": l["item_name"],
              "quantity": l["quantity"],
              "unit_price": l["unit_price"],
              "cost_price": l["cost_price"],
              if (isPurchase && ((l["selling_price"] as num?) ?? 0) > 0) "selling_price": l["selling_price"],
              "amount": l["amount"],
            },
          )
          .toList();
      payload["amount"] = cartTotal;
    } else {
      final amt = double.tryParse(amountCtrl.text.trim()) ?? 0;
      if (amt <= 0) {
        setState(() => error = tr("Enter an amount greater than 0."));
        return;
      }
      if (showCategory && (category == null || category!.isEmpty)) {
        setState(() => error = tr("Please select a category."));
        return;
      }
      if (isSupplierPayment && (supplierName == null || supplierName!.isEmpty)) {
        setState(() => error = tr("Select the supplier you are paying."));
        return;
      }
      payload["amount"] = amt;
      if (showCategory && category != null && category!.isNotEmpty) {
        payload["category"] = category;
      }
      if (isSupplierPayment) payload["supplier_name"] = supplierName;
      if (showDescription && descriptionCtrl.text.trim().isNotEmpty) {
        payload["description"] = descriptionCtrl.text.trim();
      }
    }

    setState(() {
      saving = true;
      error = null;
    });
    try {
      // stock movement is done by the server (FIFO)
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
                decoration: BoxDecoration(
                  color: KadeColors.terra.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: KadeColors.terra, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(tr(error!), style: const TextStyle(color: KadeColors.terra, fontSize: 13)),
                    ),
                  ],
                ),
              ),

            _label(tr("Transaction Type *")),
            DropdownButtonFormField<String>(
              initialValue: _txTypes.any((t) => t["value"] == txType) ? txType : _txTypes.first["value"],
              items: _txTypes
                  .map((t) => DropdownMenuItem(value: t["value"], child: Text(t["label"]!)))
                  .toList(),
              onChanged: saving ? null : _changeType,
            ),
            const SizedBox(height: 16),

            _label(tr("Payment Method *")),
            DropdownButtonFormField<String>(
              initialValue: payValue,
              items: payOpts
                  .map((m) => DropdownMenuItem(value: m["value"], child: Text(m["label"]!)))
                  .toList(),
              onChanged: (saving || txType == "deposit")
                  ? null
                  : (val) => setState(() => paymentMethod = val ?? "cash"),
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
                style: FilledButton.styleFrom(
                  backgroundColor: teal,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                ),
                onPressed: saving ? null : _save,
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
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(tr(t), style: const TextStyle(fontWeight: FontWeight.w700)),
  );

  List<Widget> _supplierSection() {
    final owed = _owed;
    final amt = double.tryParse(amountCtrl.text.trim()) ?? 0;
    double n(dynamic v) => (v as num?)?.toDouble() ?? 0;
    Widget row(String k, String v, {Color? color, bool bold = false}) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
          Text(
            v,
            style: TextStyle(fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
    return [
      const SizedBox(height: 16),
      _label(tr("Supplier *")),
      DropdownButtonFormField<String>(
        initialValue: _supplierRows.any((s) => s["supplier_name"] == supplierName) ? supplierName : null,
        isExpanded: true,
        hint: Text(balances == null ? tr("Loading...") : tr("Select supplier...")),
        items: _supplierRows.map((s) {
          final o = n(s["outstanding"]);
          return DropdownMenuItem(
            value: "${s["supplier_name"]}",
            child: Text(
              "${s["supplier_name"]}${o > 0 ? " — ${tr("owed")} ${money(o)}" : ""}",
              overflow: TextOverflow.ellipsis,
            ),
          );
        }).toList(),
        onChanged: saving ? null : (v) => setState(() => supplierName = v),
      ),
      const SizedBox(height: 10),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(12),
        ),
        child: owed == null
            ? Text(
                tr("Select a supplier to see how much you owe them."),
                style: const TextStyle(fontSize: 12),
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  row(tr("Received orders"), money(n(owed["received"]))),
                  row(tr("Already paid"), "− ${money(n(owed["paid"]))}"),
                  const Divider(),
                  row(
                    n(owed["outstanding"]) >= 0 ? tr("To pay") : tr("Paid in advance"),
                    money(n(owed["outstanding"]).abs()),
                    color: n(owed["outstanding"]) > 0 ? KadeColors.danger : KadeColors.success,
                    bold: true,
                  ),
                  if (n(owed["on_order"]) > 0)
                    Text(
                      "${tr("On order, not received yet")}: ${money(n(owed["on_order"]))}",
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  if (n(owed["outstanding"]) > 0)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton(
                        onPressed: saving
                            ? null
                            : () =>
                                  setState(() => amountCtrl.text = n(owed["outstanding"]).toStringAsFixed(2)),
                        child: Text("${tr("Pay full amount")} (${money(n(owed["outstanding"]))})"),
                      ),
                    ),
                  if (amt > n(owed["outstanding"]) && n(owed["outstanding"]) >= 0)
                    Text(
                      "⚠ ${tr("This is more than you owe this supplier.")}",
                      style: const TextStyle(fontSize: 12, color: KadeColors.warning),
                    ),
                  if (balances?["payments_tracked"] == false)
                    Text(
                      tr(
                        "Earlier payments are not linked to suppliers yet, so 'Already paid' may be incomplete.",
                      ),
                      style: const TextStyle(fontSize: 12, color: KadeColors.warning),
                    ),
                ],
              ),
      ),
    ];
  }

  List<Widget> _simpleSection() {
    return [
      _label(tr("Amount (LKR) *")),
      TextField(
        controller: amountCtrl,
        enabled: !saving,
        onChanged: (_) => setState(() {}),
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
        decoration: InputDecoration(hintText: "0.00", prefixText: tr("LKR ")),
      ),
      if (showCategory) ...[
        const SizedBox(height: 16),
        _label(tr("Category *")),
        DropdownButtonFormField<String>(
          initialValue: _categoryOptions.contains(category) ? category : null,
          hint: Text(tr("Select category…")),
          items: _categoryOptions.map((c) => DropdownMenuItem(value: c, child: Text(tr(c)))).toList(),
          onChanged: saving
              ? null
              : (v) {
                  setState(() => category = v);
                  if (isSupplierPayment) _loadBalances();
                },
        ),
      ],
      if (isSupplierPayment) ..._supplierSection(),
      if (showDescription) ...[
        const SizedBox(height: 16),
        _label(tr("Description")),
        TextField(
          controller: descriptionCtrl,
          enabled: !saving,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(hintText: tr("Optional notes")),
        ),
      ],
    ];
  }

  List<Widget> _cartSection() {
    final names = inventory.map((i) => "${i["name"] ?? ""}").where((s) => s.isNotEmpty).toList();
    final itemLabel = isPurchase ? "Item Purchased *" : "Item Sold *";
    final unitsLabel = isPurchase ? "Units bought" : "Units sold";
    final priceLabel = isPurchase ? "Cost Price per Unit (LKR)" : "Selling Price per Unit (LKR)";
    final suggestion = isPurchase ? null : saleSuggestion(_hint(pickItem));
    final options = isPurchase
        ? const <({double price, double? left, bool last})>[]
        : priceOptions(_hint(pickItem));
    final priceHint = isPurchase
        ? tr("Auto-filled from inventory cost — editable")
        : (suggestion?.note ?? tr("Enter your selling price per unit"));

    return [
      _label(tr(itemLabel)),
      DropdownButtonFormField<String>(
        initialValue: names.contains(pickItem) ? pickItem : null,
        isExpanded: true, // long item names overflowed the field
        hint: Text(
          loadingInventory
              ? tr("Loading...")
              : (names.isEmpty ? tr("No inventory items yet") : tr("Select an item…")),
        ),
        items: names.map((o) {
          final inv = _findItem(o);
          return DropdownMenuItem(
            value: o,
            child: Text("$o (${inv["quantity"] ?? 0} ${tr("in stock")})", overflow: TextOverflow.ellipsis),
          );
        }).toList(),
        onChanged: saving ? null : _onPickItem,
      ),
      const SizedBox(height: 10),

      _label(tr(unitsLabel)),
      TextField(
        controller: qtyCtrl,
        enabled: !saving,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
        decoration: InputDecoration(hintText: tr(unitsLabel)),
      ),
      const SizedBox(height: 10),

      // per-unit price — cost for a purchase, selling price for a sale
      _label(tr(priceLabel)),
      TextField(
        controller: priceCtrl,
        enabled: !saving,
        onChanged: (_) => setState(() {}), // keeps the selected price button in step
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
        decoration: InputDecoration(
          hintText: "0.00",
          prefixText: tr("LKR "),
          helperText: priceHint,
          helperMaxLines: 2,
        ),
      ),
      if (options.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              for (final o in options)
                ChoiceChip(
                  label: Text(
                    o.last
                        ? "${tr("Last sold")} ${money(o.price)}"
                        : "${money(o.price)} · ${qtyOf(o.left)} ${tr("left")}",
                    style: const TextStyle(fontSize: 12),
                  ),
                  selected: (double.tryParse(priceCtrl.text.trim()) ?? -1) == o.price,
                  onSelected: saving
                      ? null
                      : (_) => setState(() => priceCtrl.text = o.price.toStringAsFixed(2)),
                ),
            ],
          ),
        ),
      if (suggestion?.warning != null)
        Container(
          margin: const EdgeInsets.only(top: 6),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: KadeColors.warning.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text("⚠ ${suggestion!.warning}", style: const TextStyle(fontSize: 12)),
        ),
      const SizedBox(height: 10),

      // purchase: the selling price / MRP of this batch — sales suggest it while this stock lasts
      if (isPurchase) ...[
        _label(tr("Selling price / MRP per unit (LKR)")),
        TextField(
          controller: sellingCtrl,
          enabled: !saving,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
          decoration: InputDecoration(
            hintText: "0.00",
            prefixText: tr("LKR "),
            helperText: tr("Optional — suggested on sales while this stock lasts"),
            helperMaxLines: 2,
          ),
        ),
        const SizedBox(height: 10),
      ],

      Align(
        alignment: Alignment.centerRight,
        child: FilledButton.tonal(
          onPressed: (pickItem == null || saving) ? null : _addToCart,
          child: Text(tr("+ Add item")),
        ),
      ),
      const SizedBox(height: 14),

      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              isPurchase ? tr("Items in this purchase") : tr("Items in this sale"),
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            const SizedBox(height: 6),
            if (cart.isEmpty)
              Padding(
                padding: EdgeInsets.symmetric(vertical: 6),
                child: Text(tr("No items added yet."), style: TextStyle(fontSize: 12, color: Colors.grey)),
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
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("${l["item_name"]}", style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text(
                              "${q.toString()} × ${money(up)}"
                              "${isPurchase && ((l["selling_price"] as num?) ?? 0) > 0 ? " · ${tr("MRP")} ${money(l["selling_price"])}" : ""}",
                              style: const TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                      Text(money(amt), style: const TextStyle(fontWeight: FontWeight.w700)),
                      IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: saving ? null : () => setState(() => cart.removeAt(i)),
                      ),
                    ],
                  ),
                );
              }),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(tr("Total"), style: TextStyle(fontWeight: FontWeight.w800)),
                Text(money(cartTotal), style: const TextStyle(fontWeight: FontWeight.w800)),
              ],
            ),
          ],
        ),
      ),
    ];
  }
}
