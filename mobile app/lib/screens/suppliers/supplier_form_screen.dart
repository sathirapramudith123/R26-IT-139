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
  final addressCtrl = TextEditingController();
  final priceCtrl = TextEditingController();
  final deliveryCtrl = TextEditingController();
  final leadTimeCtrl = TextEditingController();
  final qtyCtrl = TextEditingController();

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
    addressCtrl.text = it?["address"]?.toString() ?? "";
    priceCtrl.text = it?["unit_price"]?.toString() ?? "";
    deliveryCtrl.text = it?["delivery_cost"]?.toString() ?? "";
    leadTimeCtrl.text = it?["delivery_lead_time"]?.toString() ?? it?["lead_time"]?.toString() ?? "";
    qtyCtrl.text = it?["available_quantity"]?.toString() ?? it?["quantity"]?.toString() ?? "";
    status = (it?["status"]?.toString().isNotEmpty ?? false) ? it!["status"].toString() : "active";
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    companyCtrl.dispose();
    contactCtrl.dispose();
    emailCtrl.dispose();
    addressCtrl.dispose();
    priceCtrl.dispose();
    deliveryCtrl.dispose();
    leadTimeCtrl.dispose();
    qtyCtrl.dispose();
    super.dispose();
  }

  String _capitalize(String str) {
    if (str.isEmpty) return "";
    return str[0].toUpperCase() + str.substring(1);
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

    if (nameCtrl.text.trim().isEmpty) {
      setState(() => error = "Supplier Name is required.");
      return;
    }

    final phone = contactCtrl.text.trim();
    if (phone.isEmpty) {
      setState(() => error = "Contact Number is required.");
      return;
    }
    // Accept 9–12 digits (matches the web form: local or +94-prefixed numbers).
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 9 || digits.length > 12) {
      setState(() => error = "Enter a valid contact number (e.g. 0771234567).");
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
      "address": addressCtrl.text.trim(),
      "unit_price": priceCtrl.text.trim().isNotEmpty ? (num.tryParse(priceCtrl.text.trim()) ?? 0) : 0,
      "delivery_cost": deliveryCtrl.text.trim().isNotEmpty ? (num.tryParse(deliveryCtrl.text.trim()) ?? 0) : 0,
      // Default lead time to 1 when blank, like the web form (AI reorder buffer).
      "delivery_lead_time": leadTimeCtrl.text.trim().isNotEmpty ? (int.tryParse(leadTimeCtrl.text.trim()) ?? 1) : 1,
      "available_quantity": qtyCtrl.text.trim().isNotEmpty ? (num.tryParse(qtyCtrl.text.trim()) ?? 0) : 0,
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
              maxLength: 12,
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

            fieldLabel("Address"),
            TextField(
              controller: addressCtrl,
              enabled: !saving,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(hintText: "Enter address"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Available Quantity"),
            TextField(
              controller: qtyCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Delivery Lead Time (Days)"),
            TextField(
              controller: leadTimeCtrl,
              enabled: !saving,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(hintText: "e.g. 3 (for AI reorder buffer)"),
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