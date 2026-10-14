// Price suggestions for the transaction form, from GET /transactions/price-hints.
// Same rules as the web app (frontend/src/lib/priceHints.js).
import 'i18n.dart';
import '../screens/common/record_details.dart' show money;

String priceKey(String? s) => (s ?? "").trim().toLowerCase().replaceAll(RegExp(r'\s+'), " ");

double _n(dynamic v) => double.tryParse("${v ?? ""}") ?? 0;

String _fill(String text, Map<String, String> vars) =>
    vars.entries.fold(tr(text), (s, e) => s.replaceAll("{${e.key}}", e.value));

List<Map> _batches(Map? hint) =>
    (hint?["batches"] is List) ? (hint!["batches"] as List).whereType<Map>().toList() : <Map>[];

/// Sale: the oldest batch's selling price (FIFO — old stock keeps its old price / MRP), else the
/// last price the item was sold at. price is null when there is nothing to suggest.
({double? price, String? note, String? warning}) saleSuggestion(Map? hint) {
  final batches = _batches(hint);
  final first = batches.isNotEmpty ? batches.first : null;
  final last = hint?["last_sale"] is Map ? hint!["last_sale"] as Map : null;

  if (first != null && _n(first["selling_price"]) > 0) {
    final p = _n(first["selling_price"]);
    final next = batches.where((b) => _n(b["selling_price"]) > 0 && _n(b["selling_price"]) != p);
    var note = _fill("Oldest stock: {qty} left at {price}", {
      "qty": _n(first["quantity"]).toStringAsFixed(0),
      "price": money(p),
    });
    if (next.isNotEmpty) {
      note += " · ${_fill("then {price}", {"price": money(_n(next.first["selling_price"]))})}";
    }
    return (price: p, note: "$note — ${tr("editable")}", warning: null);
  }
  if (last != null && _n(last["unit_price"]) > 0) {
    // the price comes from the last sale: warn when the stock sold next cost more than that stock did
    final oldCost = _n(last["cost_price"]);
    final newCost = first == null ? 0 : _n(first["unit_cost"]);
    final warning = oldCost > 0 && newCost > oldCost + 0.005
        ? _fill("Cost went up from {old} to {new} since the last sale — check the price", {
            "old": money(oldCost),
            "new": money(newCost),
          })
        : null;
    final p = _n(last["unit_price"]);
    return (price: p, note: "${tr("Last sold at")} ${money(p)} — ${tr("editable")}", warning: warning);
  }
  return (price: null, note: null, warning: null);
}

/// Purchase: pre-fill the selling price / MRP of the new batch with the newest known selling price.
double? purchaseSellingPrice(Map? hint) {
  final withPrice = _batches(hint).where((b) => _n(b["selling_price"]) > 0).toList();
  if (withPrice.isNotEmpty) return _n(withPrice.last["selling_price"]);
  final last = hint?["last_sale"] is Map ? hint!["last_sale"] as Map : null;
  return last != null && _n(last["unit_price"]) > 0 ? _n(last["unit_price"]) : null;
}

/// The hint with the cart [lines] taken out of stock the way the backend will do it: a line at a
/// batch's own selling price comes out of that batch first, the rest FIFO (backend saleOrder).
Map? afterCart(Map? hint, List<({double quantity, double unitPrice})> lines) {
  if (hint == null || lines.isEmpty) return hint;
  final batches = _batches(hint).map((b) => Map<String, dynamic>.from(b)).toList();
  for (final l in lines) {
    var need = l.quantity;
    final p = l.unitPrice;
    bool match(Map b) => p > 0 && _n(b["selling_price"]) == p;
    for (final b in [...batches.where(match), ...batches.where((b) => !match(b))]) {
      if (need <= 0) break;
      final q = _n(b["quantity"]);
      final take = q < need ? q : need;
      b["quantity"] = q - take;
      need -= take;
    }
  }
  return {...hint, "batches": batches.where((b) => _n(b["quantity"]) > 0).toList()};
}

/// Sale: the prices to offer as buttons — each selling price / MRP in stock (oldest first, with the
/// units left at it) and the last sold price if different. Empty when there is only one price.
List<({double price, double? left, bool last})> priceOptions(Map? hint) {
  final opts = <({double price, double? left, bool last})>[];
  for (final b in _batches(hint)) {
    final p = _n(b["selling_price"]);
    if (p <= 0) continue;
    final i = opts.indexWhere((o) => o.price == p);
    if (i >= 0) {
      opts[i] = (price: p, left: (opts[i].left ?? 0) + _n(b["quantity"]), last: false);
    } else {
      opts.add((price: p, left: _n(b["quantity"]), last: false));
    }
  }
  final double last = hint?["last_sale"] is Map ? _n((hint!["last_sale"] as Map)["unit_price"]) : 0.0;
  if (last > 0 && !opts.any((o) => o.price == last)) opts.add((price: last, left: null, last: true));
  return opts.length > 1 ? opts : [];
}

/// Sale: split [units] over the batches in FIFO order when [price] is the oldest batch's selling
/// price — 8 units with 5 left at 240 and more at 260 -> [5 × 240, 3 × 260]. A batch without a
/// selling price takes [price]. Otherwise one line at [price].
List<({double quantity, double unitPrice})> splitByBatch(Map? hint, double units, double price) {
  final queue = _batches(hint)
      .where((b) => _n(b["quantity"]) > 0)
      .map(
        (b) => (left: _n(b["quantity"]), price: _n(b["selling_price"]) > 0 ? _n(b["selling_price"]) : null),
      )
      .toList();
  if (queue.isEmpty || queue.first.price != price) return [(quantity: units, unitPrice: price)];
  final lines = <({double quantity, double unitPrice})>[];
  var need = units;
  for (final q in queue) {
    if (need <= 0) break;
    final take = q.left < need ? q.left : need;
    final p = q.price ?? price;
    if (lines.isNotEmpty && lines.last.unitPrice == p) {
      lines[lines.length - 1] = (quantity: lines.last.quantity + take, unitPrice: p);
    } else {
      lines.add((quantity: take, unitPrice: p));
    }
    need -= take;
  }
  if (need > 0) {
    // more than the batches hold: the rest at the last price
    lines[lines.length - 1] = (quantity: lines.last.quantity + need, unitPrice: lines.last.unitPrice);
  }
  return lines;
}
