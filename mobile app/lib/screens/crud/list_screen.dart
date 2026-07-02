import 'package:flutter/material.dart';
import '../../models/module_config.dart';
import '../../services/crud_service.dart';
import '../../widgets/loading.dart';
import '../../widgets/empty_state.dart';
import 'form_screen.dart';

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
        title: const Text("Delete?"),
        content: const Text("This cannot be undone."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text("Delete")),
        ],
      ),
    );
    if (ok != true) return;
    try { await service.remove(id); _load(); }
    catch (e) { _snack(e.toString().replaceFirst("Exception: ", "")); }
  }

  void _snack(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _openForm([Map<String, dynamic>? item]) async {
    final changed = await Navigator.push<bool>(context,
        MaterialPageRoute(builder: (_) => FormScreen(module: widget.module, item: item)));
    if (changed == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final cols = widget.module.listColumns;
    return Scaffold(
      appBar: AppBar(title: Text(widget.module.title)),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openForm(),
        child: const Icon(Icons.add),
      ),
      body: loading
          ? const Loading()
          : error != null
              ? Center(child: Text(error!, style: const TextStyle(color: Colors.red)))
              : items.isEmpty
                  ? EmptyState(icon: widget.module.icon, title: "No ${widget.module.title.toLowerCase()}", description: "Tap + to add one.")
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: items.length,
                        itemBuilder: (_, i) {
                          final it = items[i];
                          final title = "${it[cols.first] ?? "—"}";
                          final subtitle = cols.skip(1).map((k) => "${it[k] ?? "—"}").join("  ·  ");
                          return Card(
                            child: ListTile(
                              title: Text(title),
                              subtitle: Text(subtitle),
                              trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                                IconButton(icon: const Icon(Icons.edit, size: 20), onPressed: () => _openForm(it)),
                                IconButton(icon: const Icon(Icons.delete, size: 20, color: Colors.red), onPressed: () => _delete("${it["id"]}")),
                              ]),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}