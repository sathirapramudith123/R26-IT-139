import 'package:flutter/material.dart';
import '../../models/module_config.dart';
import '../../models/field_config.dart';
import '../../services/crud_service.dart';

class FormScreen extends StatefulWidget {
  final ModuleConfig module;
  final Map<String, dynamic>? item; // null = create
  const FormScreen({super.key, required this.module, this.item});
  @override
  State<FormScreen> createState() => _FormScreenState();
}

class _FormScreenState extends State<FormScreen> {
  late final CrudService service = CrudService(widget.module.path);
  final Map<String, TextEditingController> controllers = {};
  final Map<String, String?> selects = {};
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
  }

  @override
  void dispose() {
    for (final c in controllers.values) { c.dispose(); }
    super.dispose();
  }

  Future<void> _save() async {
    // build payload
    final Map<String, dynamic> payload = {};
    for (final f in widget.module.fields) {
      dynamic value;
      if (f.type == "select") {
        value = selects[f.key];
      } else {
        final raw = controllers[f.key]!.text.trim();
        if (f.required && raw.isEmpty) {
          setState(() => error = "${f.label} is required.");
          return;
        }
        if (raw.isEmpty) continue;
        value = f.type == "number" ? num.tryParse(raw) ?? 0 : raw;
        if (f.type == "number" && (value as num) < 0) {
          setState(() => error = "${f.label} cannot be negative.");
          return;
        }
      }
      if (value != null) payload[f.key] = value;
    }

    setState(() { saving = true; error = null; });
    try {
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
    return Scaffold(
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} ${widget.module.title}")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (error != null)
            Padding(padding: const EdgeInsets.only(bottom: 12),
                child: Text(error!, style: TextStyle(color: Colors.red.shade700))),
          ...widget.module.fields.map(_buildField),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: saving ? null : _save,
            child: Padding(padding: const EdgeInsets.all(12),
                child: Text(saving ? "Saving..." : (isEdit ? "Update" : "Save"))),
          ),
        ],
      ),
    );
  }

  Widget _buildField(FieldConfig f) {
    final label = f.required ? "${f.label} *" : f.label;
    if (f.type == "select") {
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: DropdownButtonFormField<String>(
          initialValue: selects[f.key],
          decoration: InputDecoration(labelText: label),
          items: f.options.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
          onChanged: (v) => setState(() => selects[f.key] = v),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: controllers[f.key],
        keyboardType: f.type == "number"
            ? const TextInputType.numberWithOptions(decimal: true)
            : TextInputType.text,
        decoration: InputDecoration(labelText: label),
      ),
    );
  }
}