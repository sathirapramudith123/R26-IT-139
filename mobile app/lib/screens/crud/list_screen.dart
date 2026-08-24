import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/module_config.dart';
import '../../services/crud_service.dart';
import 'form_screen.dart';
import '../transactions/transaction_form_screen.dart';
import '../inventory/inventory_form_screen.dart';
import '../suppliers/supplier_form_screen.dart';
import '../procurement/procurement_form_screen.dart';
import '../agency_banking/agency_banking_form_screen.dart';

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

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { loading = true; error = null; });
    try { items = await service.list(); }
    catch (e) { error = e.toString().replaceFirst("Exception: ", ""); }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> _delete(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text("Delete?"),
        content: const Text("This cannot be undone."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: KadeColors.terra),
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Delete"),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try { await service.remove(id); _load(); }
    catch (e) { _snack(e.toString().replaceFirst("Exception: ", "")); }
  }

  void _snack(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _openForm([Map<String, dynamic>? item]) async {
    Widget screen;
    switch (widget.module.path) {
      case "/transactions":   screen = TransactionFormScreen(item: item); break;
      case "/inventory":      screen = InventoryFormScreen(item: item); break;
      case "/suppliers":      screen = SupplierFormScreen(item: item); break;
      case "/procurement":    screen = ProcurementFormScreen(item: item); break;
      case "/agency-banking": screen = AgencyBankingFormScreen(item: item); break;
      default:                screen = FormScreen(module: widget.module, item: item);
    }
    final changed = await Navigator.push<bool>(
      context, MaterialPageRoute(builder: (_) => screen),
    ) ?? false;
    if (changed) _load();
  }

  // ---------- Details dialog ----------

  static const _hidden = [
    "id", "user_id",
    "item_name", "item_status",
    "supplier_status", "procurement_status", "banking_status",
  ];
  static const _dateFields = ["created_at", "updated_at", "read_at"];
  static const _moneyFields = [
    "amount", "unit_price", "delivery_cost", "total_cost",
    "estimated_profit", "expected_selling_price", "service_fee", "commission",
  ];
  static const _months = [
    "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  String _titleCase(String s) => s
      .split("_")
      .map((w) => w.isEmpty ? w : "${w[0].toUpperCase()}${w.substring(1)}")
      .join(" ");

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

  String _display(String key, dynamic v) {
    if (v == null || "$v".isEmpty) return "—";
    if (_dateFields.contains(key)) return _fmtDate(v);
    if (_moneyFields.contains(key)) return _fmtMoney(v);
    if (v is bool) return v ? "Yes" : "No";
    final s = "$v";
    if (RegExp(r'^[a-z_]+$').hasMatch(s)) return _titleCase(s);
    return s;
  }

  void _viewDetails(Map<String, dynamic> item) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final entries = item.entries
        .where((e) =>
            !_hidden.contains(e.key) &&
            e.value != null &&
            "${e.value}".isNotEmpty)
        .toList();

    showDialog(
      context: context,
      builder: (_) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Details",
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
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
                          color: isDark ? Colors.white10 : const Color(0xFFF3ECE0),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 2,
                              child: Text(
                                _titleCase(e.key),
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Theme.of(context).textTheme.bodySmall?.color,
                                ),
                              ),
                            ),
                            Expanded(
                              flex: 3,
                              child: Text(
                                _display(e.key, e.value),
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
      appBar: AppBar(title: Text(widget.module.title)),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: teal,
        foregroundColor: Colors.white,
        onPressed: () => _openForm(),
        icon: const Icon(Icons.add),
        label: const Text("Add", style: TextStyle(fontWeight: FontWeight.w700, fontFamily: "Nunito")),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(error!, style: const TextStyle(color: KadeColors.terra)),
                  ),
                )
              : items.isEmpty
                  ? _empty()
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                        itemCount: items.length,
                        itemBuilder: (_, i) {
                          final it = items[i];
                          final title = "${it[cols.first] ?? "—"}";
                          final subtitle = cols
                              .skip(1)
                              .map((k) => _display(k, it[k]))
                              .join("  ·  ");
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardTheme.color,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                  color: isDark ? KadeColors.borderDark : KadeColors.borderLight),
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              onTap: () => _viewDetails(it),
                              leading: Container(
                                height: 42, width: 42,
                                decoration: BoxDecoration(
                                  color: teal.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Center(
                                    child: Text(widget.module.icon,
                                        style: const TextStyle(fontSize: 20))),
                              ),
                              title: Text(title,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700, fontFamily: "Nunito")),
                              subtitle: Text(subtitle,
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Theme.of(context).textTheme.bodySmall?.color)),
                              trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                                IconButton(
                                    icon: const Icon(Icons.visibility_outlined, size: 20),
                                    onPressed: () => _viewDetails(it)),
                                IconButton(
                                    icon: const Icon(Icons.edit_outlined, size: 20),
                                    onPressed: () => _openForm(it)),
                                IconButton(
                                    icon: const Icon(Icons.delete_outline,
                                        size: 20, color: KadeColors.terra),
                                    onPressed: () => _delete("${it["id"]}")),
                              ]),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  Widget _empty() => Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(widget.module.icon, style: const TextStyle(fontSize: 52)),
          const SizedBox(height: 12),
          Text("No ${widget.module.title.toLowerCase()} yet",
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
          const SizedBox(height: 6),
          Text("Tap + to add one.",
              style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color)),
        ]),
      );
}