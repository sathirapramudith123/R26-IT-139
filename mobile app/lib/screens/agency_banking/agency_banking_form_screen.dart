import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  final _formKey = GlobalKey<FormState>();

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
    txType = (it?["transaction_type"]?.toString().isNotEmpty ?? false)
        ? it!["transaction_type"].toString()
        : "cash_deposit";
  }

  @override
  void dispose() {
    customerCtrl.dispose();
    phoneCtrl.dispose();
    amountCtrl.dispose();
    feeCtrl.dispose();
    commissionCtrl.dispose();
    super.dispose();
  }

  // Capitalize Text Utility
  String _formatType(String text) {
    return text.replaceAll("_", " ").split(' ').map((str) {
      if (str.isEmpty) return "";
      return str[0].toUpperCase() + str.substring(1);
    }).join(' ');
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus(); // Dismiss keyboard

    // Validation
    if (customerCtrl.text.trim().isEmpty) {
      setState(() => error = "Customer Name is required.");
      return;
    }
    if (phoneCtrl.text.trim().isEmpty) {
      setState(() => error = "Customer Phone is required.");
      return;
    }
    if (phoneCtrl.text.trim().length < 10) {
      setState(() => error = "Enter a valid phone number (10 digits).");
      return;
    }
    if (needsAmount) {
      final amt = num.tryParse(amountCtrl.text.trim());
      if (amt == null || amt <= 0) {
        setState(() => error = "Please enter a valid amount.");
        return;
      }
    }

    final payload = <String, dynamic>{
      "customer_name": customerCtrl.text.trim(),
      "customer_phone": phoneCtrl.text.trim(),
      "transaction_type": txType,
      "amount": needsAmount ? (num.tryParse(amountCtrl.text.trim()) ?? 0) : 0,
      "service_fee": feeCtrl.text.trim().isNotEmpty ? (num.tryParse(feeCtrl.text.trim()) ?? 0) : 0,
      "commission": commissionCtrl.text.trim().isNotEmpty ? (num.tryParse(commissionCtrl.text.trim()) ?? 0) : 0,
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
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} Agency Banking")),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(), // Tap background to close keyboard
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (error != null) ...[
              errorBox(error!),
              const SizedBox(height: 12),
            ],

            fieldLabel("Customer Name *"),
            TextField(
              controller: customerCtrl,
              enabled: !saving,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(hintText: "Enter customer full name"),
            ),
            const SizedBox(height: 16),

            fieldLabel("Customer Phone *"),
            TextField(
              controller: phoneCtrl,
              enabled: !saving,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              maxLength: 10,
              decoration: const InputDecoration(hintText: "07XXXXXXXX", counterText: ""),
            ),
            const SizedBox(height: 16),

            fieldLabel("Transaction Type *"),
            DropdownButtonFormField<String>(
              value: types.contains(txType) ? txType : types.first,
              decoration: const InputDecoration(),
              items: types.map((o) => DropdownMenuItem(value: o, child: Text(_formatType(o)))).toList(),
              onChanged: saving
                  ? null
                  : (v) {
                      if (v != null) {
                        setState(() {
                          txType = v;
                          if (txType == "balance_inquiry") {
                            amountCtrl.clear();
                          }
                        });
                      }
                    },
            ),

            if (needsAmount) ...[
              const SizedBox(height: 16),
              fieldLabel("Amount (LKR) *"),
              TextField(
                controller: amountCtrl,
                enabled: !saving,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
                decoration: const InputDecoration(hintText: "0.00", prefixText: "LKR "),
              ),
            ],

            const SizedBox(height: 16),
            fieldLabel("Service Fee (LKR)"),
            TextField(
              controller: feeCtrl,
              enabled: !saving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
              decoration: const InputDecoration(hintText: "0.00", prefixText: "LKR "),
            ),

            const SizedBox(height: 16),
            fieldLabel("Commission (LKR)"),
            TextField(
              controller: commissionCtrl,
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