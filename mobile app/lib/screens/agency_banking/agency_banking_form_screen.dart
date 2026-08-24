import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/crud_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;

class AgencyBankingFormScreen extends StatefulWidget {
  final Map<String, dynamic>? item;
  const AgencyBankingFormScreen({super.key, this.item});
  @override
  State<AgencyBankingFormScreen> createState() => _AgencyBankingFormScreenState();
}

class _AgencyBankingFormScreenState extends State<AgencyBankingFormScreen> {
  final service = CrudService("/agency-banking");
  final customerCtrl = TextEditingController();
  final phoneCtrl = TextEditingController();
  final amountCtrl = TextEditingController();
  final feeCtrl = TextEditingController();
  final commissionCtrl = TextEditingController();
  String txType = "cash_deposit";
  bool saving = false;
  String? error;

  static const types = ["cash_deposit", "cash_withdrawal", "fund_transfer", "balance_inquiry"];
  bool get isEdit => widget.item != null;
  bool get needsAmount => txType != "balance_inquiry";

  @override
  void initState() {
    super.initState();
    final it = widget.item;
    customerCtrl.text = it?["customer_name"]?.toString() ?? "";
    phoneCtrl.text = it?["customer_phone"]?.toString() ?? "";
    amountCtrl.text = it?["amount"]?.toString() ?? "";
    feeCtrl.text = it?["service_fee"]?.toString() ?? "";
    commissionCtrl.text = it?["commission"]?.toString() ?? "";
    txType = it?["transaction_type"]?.toString() ?? "cash_deposit";
  }

  @override
  void dispose() {
    customerCtrl.dispose(); phoneCtrl.dispose(); amountCtrl.dispose();
    feeCtrl.dispose(); commissionCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (customerCtrl.text.trim().isEmpty) { setState(() => error = "Customer Name is required."); return; }
    if (phoneCtrl.text.trim().isEmpty) { setState(() => error = "Customer Phone is required."); return; }
    if (needsAmount && amountCtrl.text.trim().isEmpty) { setState(() => error = "Amount is required."); return; }

    final payload = <String, dynamic>{
      "customer_name": customerCtrl.text.trim(),
      "customer_phone": phoneCtrl.text.trim(),
      "transaction_type": txType,
      "amount": needsAmount ? (num.tryParse(amountCtrl.text.trim()) ?? 0) : 0,
    };
    if (feeCtrl.text.trim().isNotEmpty) payload["service_fee"] = num.tryParse(feeCtrl.text.trim()) ?? 0;
    if (commissionCtrl.text.trim().isNotEmpty) payload["commission"] = num.tryParse(commissionCtrl.text.trim()) ?? 0;

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
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} Agency Banking")),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        if (error != null) errorBox(error!),
        fieldLabel("Customer Name *"),
        TextField(controller: customerCtrl, decoration: const InputDecoration(hintText: "Customer name")),
        const SizedBox(height: 16),
        fieldLabel("Customer Phone *"),
        TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(hintText: "07X XXX XXXX")),
        const SizedBox(height: 16),
        fieldLabel("Type *"),
        DropdownButtonFormField<String>(
          initialValue: txType,
          items: types.map((o) => DropdownMenuItem(value: o, child: Text(o.replaceAll("_", " ")))).toList(),
          onChanged: (v) => setState(() => txType = v ?? "cash_deposit"),
        ),
        if (needsAmount) ...[
          const SizedBox(height: 16),
          fieldLabel("Amount (LKR) *"),
          TextField(controller: amountCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: "0.00")),
        ],
        const SizedBox(height: 16),
        fieldLabel("Service Fee (LKR)"),
        TextField(controller: feeCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: "0.00")),
        const SizedBox(height: 16),
        fieldLabel("Commission (LKR)"),
        TextField(controller: commissionCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(hintText: "0.00")),
        const SizedBox(height: 24),
        saveButton(saving, isEdit, teal, _save),
      ]),
    );
  }
}