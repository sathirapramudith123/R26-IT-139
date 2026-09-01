import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../services/crud_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;

// Sri Lankan districts — Delivery Location dropdown (web එකට ගැලපෙන්න)
const List<String> kDeliveryLocations = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
  "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
  "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
  "Monaragala", "Ratnapura", "Kegalle",
];

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
  final deliveryCtrl = TextEditingController();
  final leadTimeCtrl = TextEditingController();
  final qtyCtrl = TextEditingController();

  String? deliveryLocation; // unit_price + status අයින් — delivery location එකතු
  bool saving = false;
  String? error;

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
    deliveryCtrl.text = it?["delivery_cost"]?.toString() ?? "";
    leadTimeCtrl.text = it?["delivery_lead_time"]?.toString() ?? it?["lead_time"]?.toString() ?? "";
    qtyCtrl.text = it?["available_quantity"]?.toString() ?? it?["quantity"]?.toString() ?? "";
    final dl = it?["delivery_location"]?.toString();
    deliveryLocation = (dl != null && dl.isNotEmpty) ? dl : null;
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    companyCtrl.dispose();
    contactCtrl.dispose();
    emailCtrl.dispose();
    addressCtrl.dispose();
    deliveryCtrl.dispose();
    leadTimeCtrl.dispose();
    qtyCtrl.dispose();
    super.dispose();
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
      "company_name": companyCtrl.text.trim(),
      "email": email,
      "address": addressCtrl.text.trim(),
      "delivery_location": deliveryLocation, // NEW
      "delivery_cost": deliveryCtrl.text.trim().isNotEmpty ? (num.tryParse(deliveryCtrl.text.trim()) ?? 0) : 0,
      "delivery_lead_time": leadTimeCtrl.text.trim().isNotEmpty ? (int.tryParse(leadTimeCtrl.text.trim()) ?? 1) : 1,
      "available_quantity": qtyCtrl.text.trim().isNotEmpty ? (num.tryParse(qtyCtrl.text.trim()) ?? 0) : 0,
      // unit_price + status form එකෙන් තව යවන්නෙ නෑ (backend defaults)
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

            // NEW: Delivery Location dropdown
            fieldLabel("Delivery Location"),
            DropdownButtonFormField<String>(
              value: kDeliveryLocations.contains(deliveryLocation) ? deliveryLocation : null,
              hint: const Text("Select delivery location…"),
              items: kDeliveryLocations.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
              onChanged: saving ? null : (v) => setState(() => deliveryLocation = v),
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

            fieldLabel("Delivery Cost (LKR)"),
            TextField(
              controller: deliveryCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0.00", prefixText: "LKR "),
            ),
            const SizedBox(height: 28),

            saveButton(saving, isEdit, teal, _save),
          ],
        ),
      ),
    );
  }
}