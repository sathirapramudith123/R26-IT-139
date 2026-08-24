import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../services/crud_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;

/// CBSL transaction limits in LKR.
///
/// IMPORTANT: keep these values identical to the web app's `CBSL_LIMITS`
/// (imported there from `@/lib/constants`). A `null` / missing entry means
/// "no limit for this transaction type". The example numbers below are
/// placeholders — replace them with your real, backend-agreed limits.
const Map<String, num?> kCbslLimits = {
  "cash_deposit": 500000,
  "cash_withdrawal": 100000,
  "fund_transfer": 500000,
  "balance_inquiry": null,
};

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
  String status = "completed";
  bool saving = false;
  String? error;

  static const types = ["cash_deposit", "cash_withdrawal", "fund_transfer", "balance_inquiry"];
  static const statuses = ["completed", "pending", "failed"];

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
    status = (it?["status"]?.toString().isNotEmpty ?? false)
        ? it!["status"].toString()
        : "completed";
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

  String _formatType(String text) {
    return text.replaceAll("_", " ").split(' ').map((str) {
      if (str.isEmpty) return "";
      return str[0].toUpperCase() + str.substring(1);
    }).join(' ');
  }

  // Thousands-separated LKR value for hints/messages, e.g. 100000 -> "100,000".
  String _money(num n) {
    final fixed = n == n.roundToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(2);
    final parts = fixed.split('.');
    final intPart = parts[0].replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (m) => ',',
    );
    return parts.length > 1 ? "$intPart.${parts[1]}" : intPart;
  }

  // Mirrors the web form: auto-fill fee & commission from the amount, but
  // only when creating a new transaction (never when editing an existing one).
  // The values stay editable — the agent can override them afterwards.
  void _onAmountChanged(String val) {
    if (isEdit) return;
    final amt = num.tryParse(val.trim()) ?? 0;
    if (amt > 0) {
      final fee = (amt * 0.002) < 20 ? 20.0 : (amt * 0.002);
      feeCtrl.text = fee.toStringAsFixed(2);
      commissionCtrl.text = (amt * 0.005).toStringAsFixed(2);
    }
  }

  Widget _hint(String text) => Padding(
        padding: const EdgeInsets.only(top: 6, left: 2),
        child: Text(text,
            style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color)),
      );

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

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
      final limit = kCbslLimits[txType];
      if (limit != null && amt > limit) {
        setState(() => error = "Amount exceeds the CBSL limit of LKR ${_money(limit)}.");
        return;
      }
    }

    num parseNum(String s) => s.trim().isEmpty ? 0 : (num.tryParse(s.trim()) ?? 0);

    final payload = <String, dynamic>{
      "customer_name": customerCtrl.text.trim(),
      "customer_phone": phoneCtrl.text.trim(),
      "transaction_type": txType,
      "amount": needsAmount ? parseNum(amountCtrl.text) : 0,
      "service_fee": parseNum(feeCtrl.text),
      "commission": parseNum(commissionCtrl.text),
      "status": status,
      // ---- Fields the ML models expect (not user-facing) ----
      "channel": "pos_terminal", // matches the web default the model was trained on
      "created_offline": false,
      "tx_hour": DateTime.now().hour, // real-time hour for anomaly detection
    };

    setState(() {
      saving = true;
      error = null;
    });

    try {
      isEdit
          ? await service.update("${widget.item!["id"]}", payload)
          : await service.create(payload);
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
    final limit = kCbslLimits[txType];

    return Scaffold(
      appBar: AppBar(title: Text("${isEdit ? "Edit" : "New"} Agency Banking")),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: Form(
          key: _formKey,
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
                items: types
                    .map((o) => DropdownMenuItem(value: o, child: Text(_formatType(o))))
                    .toList(),
                onChanged: saving
                    ? null
                    : (val) {
                        if (val != null) {
                          setState(() {
                            txType = val;
                            if (txType == "balance_inquiry") amountCtrl.clear();
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
                  onChanged: _onAmountChanged,
                ),
                if (limit != null) _hint("CBSL limit: LKR ${_money(limit)}"),
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
              _hint(isEdit ? "Charged to the customer" : "Auto-filled from amount — you can change it"),

              const SizedBox(height: 16),
              fieldLabel("Commission (LKR)"),
              TextField(
                controller: commissionCtrl,
                enabled: !saving,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
                decoration: const InputDecoration(hintText: "0.00", prefixText: "LKR "),
              ),
              _hint(isEdit ? "Your payout as agent" : "Auto-filled from amount — you can change it"),

              // Status is editable only when editing an existing transaction,
              // exactly like the web form.
              if (isEdit) ...[
                const SizedBox(height: 16),
                fieldLabel("Status"),
                DropdownButtonFormField<String>(
                  value: statuses.contains(status) ? status : statuses.first,
                  decoration: const InputDecoration(),
                  items: statuses
                      .map((s) => DropdownMenuItem(
                          value: s, child: Text(s[0].toUpperCase() + s.substring(1))))
                      .toList(),
                  onChanged: saving ? null : (val) => setState(() => status = val ?? status),
                ),
              ],

              const SizedBox(height: 28),
              saveButton(saving, isEdit, teal, _save),
            ],
          ),
        ),
      ),
    );
  }
}