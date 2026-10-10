import 'package:flutter/material.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import '../common/record_details.dart' show money, qtyOf, numOf, words, hasText;

/// Per-module list look, matching the web tables: what each row shows, what the
/// search box looks in, and the short description under the page title.

/// One list row: title, a detail line, the figure on the right and an optional pill.
class ListRow {
  final String title;
  final String subtitle;
  final String? figure;
  final Color? figureColor;
  final (String, Color)? badge;
  const ListRow({required this.title, required this.subtitle, this.figure, this.figureColor, this.badge});
}

const _moneyIn = {"sale", "deposit"};

bool isLowStock(Map item) => numOf(item["quantity"]) <= numOf(item["reorder_level"]);

String moduleDescription(String path) => switch (path) {
  "/transactions" => tr("All financial transactions."),
  "/inventory" => tr("Track stock levels and items."),
  "/suppliers" => tr("Manage supplier details."),
  "/procurement" => tr("Manage procurement decisions."),
  "/agency-banking" => tr("Customer banking transactions and commission."),
  _ => "",
};

String searchHint(String path) => switch (path) {
  "/transactions" => tr("Search by type, category, payment..."),
  "/inventory" => tr("Search by name or supplier..."),
  "/suppliers" => tr("Search by name, company, contact..."),
  "/procurement" => tr("Search by item or supplier..."),
  "/agency-banking" => tr("Search by customer, phone, type..."),
  _ => tr("Search..."),
};

/// Same fields the web search looks in
bool matchesSearch(String path, Map item, String q) {
  final keys = switch (path) {
    "/transactions" => ["transaction_type", "category", "payment_method", "description"],
    "/inventory" => ["name", "supplier_name"],
    "/suppliers" => ["name", "company_name", "contact_number"],
    "/procurement" => ["item_name", "selected_supplier_name", "procurement_no"],
    "/agency-banking" => ["customer_name", "customer_phone", "transaction_type"],
    _ => item.keys.toList(),
  };
  final text = keys.map((k) => "${item[k] ?? ""}").join(" ").toLowerCase();
  return text.contains(q) || text.replaceAll("_", " ").contains(q);
}

/// Status pill colours, same tones as the web StatusBadge
(String, Color) statusBadge(dynamic status) {
  final s = "${status ?? ""}".toLowerCase();
  final color = switch (s) {
    "pending" || "running_out" => KadeColors.amber,
    "active" || "available" => KadeColors.success,
    "completed" || "received" => KadeColors.teal,
    "ordered" => const Color(0xFF7C3AED),
    "failed" => KadeColors.terra,
    _ => Colors.grey,
  };
  return (words(s.isEmpty ? "pending" : s), color);
}

String _dateShort(dynamic v) {
  final d = DateTime.tryParse("${v ?? ""}");
  if (d == null) return "";
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  final l = d.toLocal();
  return "${l.day} ${m[l.month - 1]} ${l.year}";
}

String _join(List<String> parts) => parts.where((p) => p.trim().isNotEmpty && p != "—").join("  ·  ");

ListRow? rowFor(String path, Map it) {
  switch (path) {
    case "/transactions":
      final type = "${it["transaction_type"] ?? ""}".toLowerCase();
      final isIn = _moneyIn.contains(type);
      return ListRow(
        title: words(type),
        subtitle: _join([
          words(it["payment_method"]),
          if (hasText(it["category"])) "${it["category"]}",
          _dateShort(it["created_at"]),
        ]),
        figure: "${isIn ? "+" : "-"} ${money(it["amount"])}",
        figureColor: isIn ? KadeColors.success : KadeColors.terra,
        badge: isIn ? (tr("Credit"), KadeColors.success) : (tr("Debit"), KadeColors.terra),
      );
    case "/inventory":
      final low = isLowStock(it);
      final unit = hasText(it["unit"]) && it["unit"] != "unit" ? " ${tr("${it["unit"]}")}" : "";
      final multi = numOf(it["batch_count"]) > 1 && numOf(it["cost_min"]) != numOf(it["cost_max"]);
      return ListRow(
        title: "${it["name"] ?? "—"}",
        subtitle: _join([
          "${tr("Qty")} ${qtyOf(it["quantity"])}$unit",
          "${tr("Reorder")} ${qtyOf(it["reorder_level"])}",
          hasText(it["supplier_name"]) ? "${it["supplier_name"]}" : "",
          if (multi) "${money(it["cost_min"])}–${money(it["cost_max"])}",
        ]),
        figure: money(it["cost_price"]),
        badge: numOf(it["quantity"]) <= 0
            ? (tr("Out of stock"), KadeColors.terra)
            : low
            ? (tr("Running out"), KadeColors.terra)
            : null,
      );
    case "/suppliers":
      final n = it["items_supplied"] is List ? (it["items_supplied"] as List).length : 0;
      return ListRow(
        title: "${it["name"] ?? "—"}",
        subtitle: _join([
          hasText(it["company_name"]) ? "${it["company_name"]}" : "",
          "${it["contact_number"] ?? ""}",
          hasText(it["delivery_location"]) ? tr("${it["delivery_location"]}") : "",
        ]),
        figure: n > 0 ? "$n ${tr("items")}" : null,
        badge: statusBadge(it["status"] ?? "active"),
      );
    case "/procurement":
      final items = it["items"] is List ? (it["items"] as List).whereType<Map>().toList() : <Map>[];
      final name = items.isEmpty
          ? "${it["item_name"] ?? "—"}"
          : items.length == 1
          ? "${items.first["item_name"] ?? "—"}"
          : "${items.first["item_name"] ?? "—"} +${items.length - 1}";
      return ListRow(
        title: name,
        subtitle: _join([
          "${it["procurement_no"] ?? ""}",
          items.length > 1
              ? "${items.length} ${tr("items")}"
              : "${tr("Qty")} ${qtyOf(items.isEmpty ? it["quantity"] : items.first["quantity"])}"
                    "${hasText((items.isEmpty ? it : items.first)["unit"]) ? " ${tr("${(items.isEmpty ? it : items.first)["unit"]}")}" : ""}",
          hasText(it["selected_supplier_name"]) ? "${it["selected_supplier_name"]}" : "",
        ]),
        figure: money(it["total_cost"]),
        badge: statusBadge(it["status"]),
      );
    case "/agency-banking":
      final flagged = it["is_anomaly"] == true;
      return ListRow(
        title: hasText(it["customer_name"]) ? "${it["customer_name"]}" : words(it["transaction_type"]),
        subtitle: _join([
          words(it["transaction_type"]),
          "${tr("Commission")} ${money(it["commission"])}",
          _dateShort(it["created_at"]),
        ]),
        figure: money(it["amount"]),
        badge: flagged ? (tr("⚠ Looks unusual"), KadeColors.terra) : statusBadge(it["status"]),
      );
  }
  return null;
}

class StatusPill extends StatelessWidget {
  final String label;
  final Color color;
  const StatusPill(this.label, this.color, {super.key});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(KadeRadius.pill),
      border: Border.all(color: color.withValues(alpha: 0.35)),
    ),
    child: Text(
      label,
      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: color),
    ),
  );
}

/// Small white stat card used above a list (agency banking totals, etc.)
class MiniStat extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  const MiniStat(this.label, this.value, {super.key, this.color});

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(KadeRadius.md),
        border: Border.all(color: dark ? KadeColors.borderDark : KadeColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: color),
            ),
          ),
        ],
      ),
    );
  }
}
