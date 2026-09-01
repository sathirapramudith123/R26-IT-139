import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';                       
import '../../models/module_config.dart';
import '../../models/field_config.dart';
import '../../services/crud_service.dart';

class FormScreen extends StatefulWidget {
  final ModuleConfig module;
  final Map<String, dynamic>? item;
  const FormScreen({super.key, required this.module, this.item});
  @override
  State<FormScreen> createState() => _FormScreenState();
}

class _FormScreenState extends State<FormScreen> {
  late final CrudService service = CrudService(widget.module.path);
  final Map<String, TextEditingController> controllers = {};
  final Map<String, String?> selects = {};
  final Map<String, List<String>> dynamicOptions = {}; 
  bool saving = false;
  String? error;

  bool get isEdit => widget.item != null;

  @override
  void initState() {
    super.initState();
    for (final f in widget.module.fields) {
      final existing = widget.item?[f.key];
      if (f.type == "select") {
        selects[f.key] = existing?.toString() ?? (f.options.isNotEmpty ? f.options.first : null);
      } else {
        controllers[f.key] = TextEditingController(text: existing?.toString() ?? "");
      }
    }
    _loadDynamicOptions();
  }

  Future<void> _loadDynamicOptions() async {
    for (final f in widget.module.fields) {
      if (f.optionsSource != null) {
        try {
          final data = await Api.get(f.optionsSource!);
          final list = (data is List) ? data : [];
          final names = list
              .map((e) => "${e[f.optionsLabelKey ?? "name"] ?? ""}")
              .where((s) => s.isNotEmpty)
              .toList();
          final current = selects[f.key];
          if (current != null && current.isNotEmpty && !names.contains(current)) {
            names.insert(0, current);
          }
          if (mounted) setState(() => dynamicOptions[f.key] = names);
        } catch (_) {
          if (mounted) setState(() => dynamicOptions[f.key] = []);
        }
      }
    }
  }

  @override
  void dispose() {
    for (final c in controllers.values) { c.dispose(); }
    super.dispose();
  }

  Future<void> _save() async {
    final Map<String, dynamic> payload = {};
    for (final f in widget.module.fields) {
      dynamic value;
      if (f.type == "select") {
        value = selects[f.key];
      } else {
        final raw = controllers[f.key]!.text.trim();
        if (f.required && raw.isEmpty) { setState(() => error = "${f.label} is required."); return; }
        if (raw.isEmpty) continue;
        value = f.type == "number" ? (num.tryParse(raw) ?? 0) : raw;
        if (f.type == "number" && (value as num) < 0) { setState(() => error = "${f.label} cannot be negative."); return; }
      }
      if (value != null && value.toString().isNotEmpty) payload[f.key] = value;
    }

    setState(() { saving = true; error = null; });
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final teal = isDark ? KadeColors.tealDark : KadeColors.teal;

    return Scaffold(
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} ${widget.module.title}")),
      body: ListView(
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
          ...widget.module.fields.map(_buildField),
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
    );
  }

  Widget _buildField(FieldConfig f) {
    final label = f.required ? "${f.label} *" : f.label;

    final isDynamic = f.optionsSource != null;
    final opts = isDynamic ? (dynamicOptions[f.key] ?? []) : f.options;
    final isSelect = f.type == "select";

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontFamily: "Nunito")),
          const SizedBox(height: 6),
          if (isSelect && isDynamic && opts.isEmpty)
            TextField(
              onChanged: (val) => selects[f.key] = val,
              controller: TextEditingController(text: selects[f.key] ?? ""),
              decoration: const InputDecoration(hintText: "No suppliers yet — type a name"),
            )
          else if (isSelect)
            DropdownButtonFormField<String>(
              initialValue: (opts.contains(selects[f.key])) ? selects[f.key] : null,
              hint: const Text("— Select —"),
              items: opts.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
              onChanged: (val) => setState(() => selects[f.key] = val),
            )
          else
            TextField(
              controller: controllers[f.key],
              keyboardType: f.type == "number" ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
              decoration: InputDecoration(hintText: f.label),
            ),
        ],
      ),
    );
  }
}