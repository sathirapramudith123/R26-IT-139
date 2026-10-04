import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/module_config.dart';
import '../../services/crud_service.dart';
import 'form_screen.dart';
import '../transactions/transaction_form_screen.dart';
import '../inventory/inventory_form_screen.dart';
import '../suppliers/supplier_form_screen.dart';
import '../procurement/procurement_form_screen.dart';
import '../procurement/procurement_details_screen.dart';
import '../agency_banking/agency_banking_form_screen.dart';
import '../../core/i18n.dart';
import '../suppliers/supplier_route_screen.dart';

class ListScreen extends StatefulWidget {
  final ModuleConfig module;
  const ListScreen({super.key, required this.module});
  @override
  State<ListScreen> createState() => _ListScreenState();
}

class _ListScreenState extends State<ListScreen> {
  late final CrudService service = CrudService(widget.module.path);
  List<Map<String, dynamic>> items = [];
  bool loading = true;
  String? error;

  final searchCtrl = TextEditingController();
  String query = "";

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      items = await service.list();
    } catch (e) {
      error = e.toString().replaceFirst("Exception: ", "");
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _delete(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KadeRadius.lg)),
        title: Text(tr("Delete?")),
        content: Text(tr("This cannot be undone.")),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(tr("Cancel"))),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: KadeColors.terra),
            onPressed: () => Navigator.pop(context, true),
            child: Text(tr("Delete")),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await service.remove(id);
      _load();
    } catch (e) {
      _snack(e.toString().replaceFirst("Exception: ", ""));
    }
  }

  void _snack(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr(m))));

  // Searches across every column shown in the list (title + subtitle
  // fields) — case-insensitive substring match, purely client-side since
  // the list is already loaded in memory.
  List<Map<String, dynamic>> get _filteredItems {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return items;
    final cols = widget.module.listColumns;
    return items.where((it) {
      for (final k in cols) {
        if (_display(k, it[k]).toLowerCase().contains(q)) return true;
      }
      return false;
    }).toList();
  }

  Future<void> _openForm([Map<String, dynamic>? item]) async {
    Widget screen;
    switch (widget.module.path) {
      case "/transactions":
        screen = TransactionFormScreen(item: item);
        break;
      case "/inventory":
        screen = InventoryFormScreen(item: item);
        break;
      case "/suppliers":
        screen = SupplierFormScreen(item: item);
        break;
      case "/procurement":
        screen = ProcurementFormScreen(item: item);
        break;
      case "/agency-banking":
        screen = AgencyBankingFormScreen(item: item);
        break;
      default:
        screen = FormScreen(module: widget.module, item: item);
    }
    final changed = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => screen)) ?? false;
    if (changed) _load();
  }

  // ---------- Details dialog ----------

  static const _hidden = [
    "id",
    "user_id",
    "item_name",
    "item_status",
    "supplier_status",
    "procurement_status",
    "banking_status",
    // map / model internals — shown elsewhere (map pins) or meaningless to a merchant
    "coords",
    "latitude",
    "longitude",
    "metadata",
    "features",
    "explanation",
    "batch_ids",
  ];
  static const _dateFields = ["created_at", "updated_at", "read_at"];
  static const _moneyFields = [
    "amount",
    "unit_price",
    "cost_price",
    "delivery_cost",
    "total_cost",
    "estimated_profit",
    "expected_selling_price",
    "service_fee",
    "commission",
  ];
  static const _months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  String _titleCase(String s) =>
      s.split("_").map((w) => w.isEmpty ? w : "${w[0].toUpperCase()}${w.substring(1)}").join(" ");

  String _fmtDate(dynamic v) {
    final d = DateTime.tryParse("$v");
    if (d == null) return "—";
    final l = d.toLocal();
    final h = l.hour % 12 == 0 ? 12 : l.hour % 12;
    final ap = l.hour < 12 ? "AM" : "PM";
    final mm = l.minute.toString().padLeft(2, "0");
    return "${l.day} ${_months[l.month - 1]} ${l.year}, $h:$mm $ap";
  }

  String _fmtMoney(dynamic v) {
    final n = num.tryParse("$v");
    if (n == null) return "—";
    return "LKR ${n.toStringAsFixed(2)}";
  }

  // One readable line for an entry of a list field, e.g. an item line:
  // "Salt — 67 g × LKR 120.00" (instead of the raw {unit: g, quantity: 67, ...})
  String _lineOf(dynamic v) {
    if (v is! Map) return "$v";
    final name = v["item_name"] ?? v["name"] ?? v["item"];
    final qty = v["quantity"];
    final unit = v["unit"] == null || v["unit"] == "unit" ? "" : " ${tr("${v["unit"]}")}";
    final price = v["unit_cost"] ?? v["unit_price"] ?? v["cost_price"];
    if (name != null && qty != null) {
      final q = num.tryParse("$qty") ?? 0;
      final qs = q == q.roundToDouble() ? q.toStringAsFixed(0) : q.toStringAsFixed(2);
      return "$name — $qs$unit${price != null ? " × ${_fmtMoney(price)}" : ""}";
    }
    if (name != null) return "$name";
    return v.entries
        .where((e) => e.value != null)
        .map((e) => "${tr(_titleCase(e.key))}: ${e.value}")
        .join(", ");
  }

  // a list / map value? (rendered as lines, or skipped when empty)
  bool _isEmptyValue(dynamic v) =>
      v == null || "$v".isEmpty || (v is List && v.isEmpty) || (v is Map && v.isEmpty);

  String _display(String key, dynamic v) {
    if (v == null || "$v".isEmpty) return "—";
    if (_dateFields.contains(key)) return _fmtDate(v);
    if (_moneyFields.contains(key)) return _fmtMoney(v);
    if (v is bool) return v ? tr("Yes") : tr("No");
    final s = "$v";
    if (RegExp(r'^[a-z_]+$').hasMatch(s)) return _titleCase(s);
    return s;
  }

  void _viewDetails(Map<String, dynamic> item) {
    // procurement orders hold lists (items, ranked suppliers) — they get their own screen
    if (widget.module.path == "/procurement") {
      Navigator.push(context, MaterialPageRoute(builder: (_) => ProcurementDetailsScreen(order: item)));
      return;
    }
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final entries = item.entries.where((e) => !_hidden.contains(e.key) && !_isEmptyValue(e.value)).toList();

    showDialog(
      context: context,
      builder: (_) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KadeRadius.lg)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(tr("Details"), style: Theme.of(context).textTheme.titleLarge),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                ],
              ),
              const SizedBox(height: 8),
              Flexible(
                child: SingleChildScrollView(
                  child: Column(
                    children: entries.map((e) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white10 : KadeColors.surfaceMutedLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: e.value is List
                            ? Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    tr(_titleCase(e.key)),
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Theme.of(context).textTheme.bodySmall?.color,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  for (final line in e.value as List)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text("•  ", style: TextStyle(fontWeight: FontWeight.w700)),
                                          Expanded(
                                            child: Text(
                                              _lineOf(line),
                                              style: const TextStyle(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
                              )
                            : Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    flex: 2,
                                    child: Text(
                                      tr(_titleCase(e.key)),
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: Theme.of(context).textTheme.bodySmall?.color,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 3,
                                    child: Text(
                                      e.value is Map ? _lineOf(e.value) : tr(_display(e.key, e.value)),
                                      textAlign: TextAlign.right,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ],
                              ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              // suppliers with a map pin: open the road route from where you are now
              if (widget.module.path == "/suppliers" &&
                  item["latitude"] != null &&
                  item["longitude"] != null) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    icon: const Icon(Icons.directions_outlined),
                    label: Text(tr("How far? Show route")),
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => SupplierRouteScreen(supplier: item)),
                      );
                    },
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ---------- Build ----------

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final teal = isDark ? KadeColors.tealDark : KadeColors.teal;
    final cols = widget.module.listColumns;

    return Scaffold(
      appBar: AppBar(title: Text(tr(widget.module.title))),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: teal,
        foregroundColor: Colors.white,
        onPressed: () => _openForm(),
        icon: const Icon(Icons.add),
        label: Text(tr("Add"), style: TextStyle(fontWeight: FontWeight.w600)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: searchCtrl,
              onChanged: (v) => setState(() => query = v),
              decoration: InputDecoration(
                hintText: "Search ${widget.module.title.toLowerCase()}…",
                isDense: true,
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: query.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () => setState(() {
                          searchCtrl.clear();
                          query = "";
                        }),
                      ),
              ),
            ),
          ),
          Expanded(
            child: loading
                ? const Center(child: CircularProgressIndicator())
                : error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(tr(error!), style: const TextStyle(color: KadeColors.terra)),
                    ),
                  )
                : _filteredItems.isEmpty
                ? _empty()
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 90),
                      itemCount: _filteredItems.length,
                      itemBuilder: (_, i) {
                        final it = _filteredItems[i];
                        final title = "${it[cols.first] ?? "—"}";
                        final subtitle = cols.skip(1).map((k) => _display(k, it[k])).join("  ·  ");
                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          decoration: BoxDecoration(
                            color: Theme.of(context).cardTheme.color,
                            borderRadius: BorderRadius.circular(KadeRadius.md),
                            border: Border.all(
                              color: isDark ? KadeColors.borderDark : KadeColors.borderLight,
                            ),
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                            onTap: () => _viewDetails(it),
                            leading: Container(
                              height: 40,
                              width: 40,
                              decoration: BoxDecoration(
                                color: teal.withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(KadeRadius.sm),
                              ),
                              child: Icon(widget.module.icon, size: 20, color: teal),
                            ),
                            title: Text(tr(title), style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text(
                              tr(subtitle),
                              style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).textTheme.bodySmall?.color,
                              ),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.visibility_outlined, size: 20),
                                  onPressed: () => _viewDetails(it),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, size: 20),
                                  onPressed: () => _openForm(it),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 20, color: KadeColors.terra),
                                  onPressed: () => _delete("${it["id"]}"),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _empty() {
    final searching = query.trim().isNotEmpty;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            searching ? Icons.search_off : widget.module.icon,
            size: 52,
            color: Theme.of(context).textTheme.bodySmall?.color,
          ),
          const SizedBox(height: 12),
          Text(
            searching ? tr("No matches found") : "No ${widget.module.title.toLowerCase()} yet",
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 6),
          Text(
            searching ? tr("Try a different search term.") : tr("Tap + to add one."),
            style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color),
          ),
        ],
      ),
    );
  }
}
