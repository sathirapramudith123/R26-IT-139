import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
    status = (it?["status"]?.toString().isNotEmpty ?? false) ? it!["status"].toString() : "active";
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    companyCtrl.dispose();
    contactCtrl.dispose();
    emailCtrl.dispose();
    priceCtrl.dispose();
    deliveryCtrl.dispose();
    super.dispose();
  }

  String _capitalize(String str) {
    if (str.isEmpty) return "";
    return str[0].toUpperCase() + str.substring(1);
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus(); // Close active keyboard

    // Validations
    if (nameCtrl.text.trim().isEmpty) {
      setState(() => error = "Supplier Name is required.");
      return;
    }
    
    final phone = contactCtrl.text.trim();
    if (phone.isEmpty) {
      setState(() => error = "Contact Number is required.");
      return;
    }
    if (phone.length < 10) {
      setState(() => error = "Enter a valid 10-digit contact number.");
      return;
    }

    final email = emailCtrl.text.trim();
    if (email.isNotEmpty) {
      final emailRegExp = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
      if (!emailRegExp.hasMatch(email)) {
        setState(() => error = "Please enter a valid email address.");
        return;
      }
    }

    final payload = <String, dynamic>{
      "name": nameCtrl.text.trim(),
      "contact_number": phone,
      "status": status,
      "company_name": companyCtrl.text.trim(),
      "email": email,
      "unit_price": priceCtrl.text.trim().isNotEmpty ? (num.tryParse(priceCtrl.text.trim()) ?? 0) : 0,
      "delivery_cost": deliveryCtrl.text.trim().isNotEmpty ? (num.tryParse(deliveryCtrl.text.trim()) ?? 0) : 0,
    };

    setState(() {
      saving = true;
      error = null;
    });

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
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (error != null) ...[
              errorBox(error!),
              const SizedBox(height: 12),
            ],

            fieldLabel("Supplier Name *"),
            TextField(
              controller: nameCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(hintText: "Enter supplier name"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Company"),
            TextField(
              controller: companyCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(hintText: "Enter company name"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Contact Number *"),
            TextField(
              controller: contactCtrl,
              enabled: !saving,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              maxLength: 10,
              decoration: const InputDecoration(hintText: "07XXXXXXXX", counterText: ""),
            ),
            const SizedBox(height: 16),

            fieldLabel("Email"),
            TextField(
              controller: emailCtrl,
              enabled: !saving,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(hintText: "name@example.com"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Unit Price (LKR)"),
            TextField(
              controller: priceCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0.00", prefixText: "LKR "),
            ),
            const SizedBox(height: 16),

            fieldLabel("Delivery Cost (LKR)"),
            TextField(
              controller: deliveryCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0.00", prefixText: "LKR "),
            ),
            const SizedBox(height: 16),

            fieldLabel("Status"),
            DropdownButtonFormField<String>(
              value: statuses.contains(status) ? status : "active",
              items: statuses.map((o) => DropdownMenuItem(value: o, child: Text(_capitalize(o)))).toList(),
              onChanged: saving ? null : (v) => setState(() => status = v ?? "active"),
            ),
            const SizedBox(height: 28),

            saveButton(saving, isEdit, teal, _save),
          ],
        ),
      ),
    );
  }
}