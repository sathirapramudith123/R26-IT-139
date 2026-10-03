import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../services/crud_service.dart';
import '../common/location_picker_map.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;
import '../../core/i18n.dart';

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
  // Delivery location text — auto-filled from the map pin (via reverse
  // geocoding or a picked search suggestion), but still editable by hand.
  // This is what the backend stores as `delivery_location` now; a separate
  // free-text address is no longer collected (see supplier.controller.js).
  final deliveryLocationCtrl = TextEditingController();
  final deliveryCtrl = TextEditingController();
  final leadTimeCtrl = TextEditingController();
  final qtyCtrl = TextEditingController();

  double? latitude;
  double? longitude;
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
    deliveryLocationCtrl.text = it?["delivery_location"]?.toString() ?? "";
    latitude = (it?["latitude"] as num?)?.toDouble();
    longitude = (it?["longitude"] as num?)?.toDouble();
    deliveryCtrl.text = it?["delivery_cost"]?.toString() ?? "";
    leadTimeCtrl.text =
        it?["lead_time_days"]?.toString() ??
        it?["delivery_lead_time"]?.toString() ??
        it?["lead_time"]?.toString() ??
        "";
    qtyCtrl.text = it?["available_quantity"]?.toString() ?? it?["quantity"]?.toString() ?? "";
  }

  @override
  void dispose() {
    nameCtrl.dispose();
    companyCtrl.dispose();
    contactCtrl.dispose();
    emailCtrl.dispose();
    deliveryLocationCtrl.dispose();
    deliveryCtrl.dispose();
    leadTimeCtrl.dispose();
    qtyCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

    if (nameCtrl.text.trim().isEmpty) {
      setState(() => error = tr("Supplier Name is required."));
      return;
    }

    final phone = contactCtrl.text.trim();
    if (phone.isEmpty) {
      setState(() => error = tr("Contact Number is required."));
      return;
    }
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 9 || digits.length > 12) {
      setState(() => error = tr("Enter a valid contact number (e.g. 0771234567)."));
      return;
    }

    final email = emailCtrl.text.trim();
    if (email.isNotEmpty) {
      final emailRegExp = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
      if (!emailRegExp.hasMatch(email)) {
        setState(() => error = tr("Please enter a valid email address."));
        return;
      }
    }

    final payload = <String, dynamic>{
      "name": nameCtrl.text.trim(),
      "contact_number": phone,
      "company_name": companyCtrl.text.trim(),
      "email": email,
      "delivery_location": deliveryLocationCtrl.text.trim(),
      "latitude": latitude,
      "longitude": longitude,
      "delivery_cost": deliveryCtrl.text.trim().isNotEmpty
          ? (num.tryParse(deliveryCtrl.text.trim()) ?? 0)
          : 0,
      "lead_time_days": leadTimeCtrl.text.trim().isNotEmpty
          ? (int.tryParse(leadTimeCtrl.text.trim()) ?? 1)
          : 1,
      "available_quantity": qtyCtrl.text.trim().isNotEmpty ? (num.tryParse(qtyCtrl.text.trim()) ?? 0) : 0,
      // unit_price and status are not sent (backend defaults apply)
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
            if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],

            fieldLabel(tr("Supplier Name *")),
            TextField(
              controller: nameCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(hintText: tr("Enter supplier name")),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Company")),
            TextField(
              controller: companyCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(hintText: tr("Enter company name")),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Contact Number *")),
            TextField(
              controller: contactCtrl,
              enabled: !saving,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              maxLength: 12,
              decoration: InputDecoration(hintText: tr("07XXXXXXXX"), counterText: ""),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Email")),
            TextField(
              controller: emailCtrl,
              enabled: !saving,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(hintText: tr("name@example.com")),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Delivery Location")),
            LocationPickerMap(
              initialLat: latitude,
              initialLng: longitude,
              height: 240,
              onPick: (lat, lng) => setState(() {
                latitude = lat;
                longitude = lng;
              }),
              onAddress: (addr) => setState(() => deliveryLocationCtrl.text = addr),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: deliveryLocationCtrl,
              enabled: !saving,
              maxLines: 2,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: tr("Address (auto-filled from the map — edit if needed)"),
              ),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Available Quantity")),
            TextField(
              controller: qtyCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0"),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Delivery Lead Time (Days)")),
            TextField(
              controller: leadTimeCtrl,
              enabled: !saving,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(hintText: tr("e.g. 3 (for AI reorder buffer)")),
            ),
            const SizedBox(height: 16),

            fieldLabel(tr("Delivery Cost (LKR)")),
            TextField(
              controller: deliveryCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: InputDecoration(hintText: "0.00", prefixText: tr("LKR ")),
            ),
            const SizedBox(height: 28),

            saveButton(saving, isEdit, teal, _save),
          ],
        ),
      ),
    );
  }
}
