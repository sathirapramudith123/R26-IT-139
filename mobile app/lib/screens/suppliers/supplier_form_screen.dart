import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/crud_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;

class SupplierFormScreen extends StatefulWidget {
  final Map<String, dynamic>? item;
  const SupplierFormScreen({super.key, this.item});
  @override
  State<SupplierFormScreen> createState() => _SupplierFormScreenState();
}

class _SupplierFormScreenState extends State<SupplierFormScreen> {
  final service = CrudService("/suppliers");
  final nameCtrl = TextEditingController();
  final companyCtrl = TextEditingController();
  final contactCtrl = TextEditingController();
  final emailCtrl = TextEditingController();
  final priceCtrl = TextEditingController();
  final deliveryCtrl = TextEditingController();
  String status = "active";
  bool saving = false;
  String? error;

  static const statuses = ["active", "pending", "inactive"];
  bool get isEdit => widget.item != null;

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    nameCtrl.text = it?["name"]?.toString() ?? "";
    companyCtrl.text = it?["company_name"]?.toString() ?? "";
    contactCtrl.text = it?["contact_number"]?.toString() ?? "";
    emailCtrl.text = it?["email"]?.toString() ?? "";
    priceCtrl.text = it?["unit_price"]?.toString() ?? "";
    deliveryCtrl.text = it?["delivery_cost"]?.toString() ?? "";
    status = it?["status"]?.toString() ?? "active";
  }

  @override
  void dispose() {
    nameCtrl.dispose(); companyCtrl.dispose(); contactCtrl.dispose();
    emailCtrl.dispose(); priceCtrl.dispose(); deliveryCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (nameCtrl.text.trim().isEmpty) { setState(() => error = "Supplier Name is required."); return; }
    if (contactCtrl.text.trim().isEmpty) { setState(() => error = "Contact Number is required."); return; }

    final payload = <String, dynamic>{
      "name": nameCtrl.text.trim(),
      "contact_number": contactCtrl.text.trim(),
      "status": status,
    };
    if (companyCtrl.text.trim().isNotEmpty) payload["company_name"] = companyCtrl.text.trim();
    if (emailCtrl.text.trim().isNotEmpty) payload["email"] = emailCtrl.text.trim();
    if (priceCtrl.text.trim().isNotEmpty) payload["unit_price"] = num.tryParse(priceCtrl.text.trim()) ?? 0;
    if (deliveryCtrl.text.trim().isNotEmpty) payload["delivery_cost"] = num.tryParse(deliveryCtrl.text.trim()) ?? 0;

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
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;
    return Scaffold(
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} Supplier")),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        if (error != null) errorBox(error!),
        fieldLabel("Supplier Name *"),
        TextField(controller: nameCtrl, decoration: const InputDecoration(hintText: "Supplier name")),
        const SizedBox(height: 16),
        fieldLabel("Company"),
        TextField(controller: companyCtrl, decoration: const InputDecoration(hintText: "Company name")),
        const SizedBox(height: 16),
        fieldLabel("Contact Number *"),
        TextField(controller: contactCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(hintText: "07X XXX XXXX")),
        const SizedBox(height: 16),
        fieldLabel("Email"),
        TextField(controller: emailCtrl, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(hintText: "name@example.com")),
        const SizedBox(height: 16),
        fieldLabel("Unit Price (LKR)"),
        TextField(controller: priceCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: "0.00")),
        const SizedBox(height: 16),
        fieldLabel("Delivery Cost (LKR)"),
        TextField(controller: deliveryCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: "0.00")),
        const SizedBox(height: 16),
        fieldLabel("Status"),
        DropdownButtonFormField<String>(
          initialValue: status,
          items: statuses.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
          onChanged: (v) => setState(() => status = v ?? "active"),
        ),
        const SizedBox(height: 24),
        saveButton(saving, isEdit, teal, _save),
      ]),
    );
  }
}