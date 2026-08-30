import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../services/crud_service.dart';
import '../../services/agent_bank_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;

/// Tiered CBSL daily limits (LKR) — keep identical to the backend
/// agencyBanking.controller.js TIER_LIMITS. `null` = no limit.
// Rural agent build: fixed LOW-tier daily limits (no KYC dropdown).
const Map<String, num?> kDailyLimits = {
  "cash_deposit": 50000,
  "cash_withdrawal": 25000,
  "fund_transfer": 50000,
};

const List<Map<String, String>> kSourceOfFunds = [
  {"value": "SALARY", "label": "Salary"},
  {"value": "BUSINESS_INCOME", "label": "Business Income"},
  {"value": "REMITTANCE", "label": "Remittance"},
  {"value": "SAVINGS", "label": "Savings"},
  {"value": "SALE_OF_PROPERTY", "label": "Sale of Property"},
  {"value": "OTHER", "label": "Other"},
];

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
  final nicCtrl = TextEditingController();          // NEW
  final accountCtrl = TextEditingController();      // NEW (mandatory)
  final sourceOtherCtrl = TextEditingController();  // free text when "OTHER"
  final amountCtrl = TextEditingController();
  final feeCtrl = TextEditingController();
  final commissionCtrl = TextEditingController();

  String txType = "cash_deposit";
  String sourceOfFunds = ""; // NEW (mandatory)
  String status = "completed";
  bool saving = false;
  String? error;

  // Agent banks (float accounts)
  List<Map<String, dynamic>> banks = [];
  String? agentBankId;                              // NEW
  bool loadingBanks = true;

  static const types = ["cash_deposit", "cash_withdrawal", "fund_transfer"];
  static const statuses = ["completed", "pending", "failed"];

  bool get isEdit => widget.item != null;
  bool get needsAmount => true;

  num? get _limit => kDailyLimits[txType];

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
    accountCtrl.text = it?["account_number"]?.toString() ?? "";
    sourceOfFunds = it?["source_of_funds"]?.toString() ?? "";
    status = (it?["status"]?.toString().isNotEmpty ?? false)
        ? it!["status"].toString()
        : "completed";
    nicCtrl.text = it?["customer_nic"]?.toString() ?? "";
    agentBankId = it?["agent_bank_id"]?.toString();
    _loadBanks();
  }

  Future<void> _loadBanks() async {
    try {
      final b = await AgentBankService.list();
      if (!mounted) return;
      setState(() {
        banks = b;
        agentBankId ??= b.isNotEmpty ? b.first["id"]?.toString() : null;
        loadingBanks = false;
      });
    } catch (_) {
      if (mounted) setState(() => loadingBanks = false);
    }
  }

  Map<String, dynamic>? get _selectedBank {
    if (agentBankId == null) return null;
    for (final b in banks) {
      if (b["id"]?.toString() == agentBankId) return b;
    }
    return null;
  }

  // Live float preview: deposit -> float DOWN, withdrawal -> float UP
  double? get _floatAfter {
    final bank = _selectedBank;
    final amt = num.tryParse(amountCtrl.text.trim()) ?? 0;
    if (bank == null || amt <= 0) return null;
    final bal = (bank["float_balance"] as num?)?.toDouble() ?? 0;
    if (txType == "cash_deposit") return bal - amt;
    if (txType == "cash_withdrawal") return bal + amt;
    return null;
  }

  // deposit -> cash UP, withdrawal -> cash DOWN
  double? get _cashAfter {
    final bank = _selectedBank;
    final amt = num.tryParse(amountCtrl.text.trim()) ?? 0;
    if (bank == null || amt <= 0) return null;
    final cash = (bank["cash_on_hand"] as num?)?.toDouble() ?? 0;
    if (txType == "cash_deposit") return cash + amt;
    if (txType == "cash_withdrawal") return cash - amt;
    return null;
  }

  @override
  void dispose() {
    customerCtrl.dispose();
    phoneCtrl.dispose();
    nicCtrl.dispose();
    accountCtrl.dispose();
    sourceOtherCtrl.dispose();
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

  String _money(num n) {
    final fixed = n == n.roundToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(2);
    final parts = fixed.split('.');
    final intPart = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return parts.length > 1 ? "$intPart.${parts[1]}" : intPart;
  }

  void _onAmountChanged(String val) {
    final amt = num.tryParse(val.trim()) ?? 0;
    if (!isEdit && amt > 0) {
      final fee = (amt * 0.002) < 20 ? 20.0 : (amt * 0.002);
      feeCtrl.text = fee.toStringAsFixed(2);
      commissionCtrl.text = (amt * 0.005).toStringAsFixed(2);
    }
    setState(() {}); // refresh live float panel
  }

  Widget _hint(String text) => Padding(
        padding: const EdgeInsets.only(top: 6, left: 2),
        child: Text(text, style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color)),
      );

  Widget _floatPanel() {
    final bank = _selectedBank!;
    final bal = (bank["float_balance"] as num?)?.toDouble() ?? 0;
    final cash = (bank["cash_on_hand"] as num?)?.toDouble() ?? 0;
    final floor = (bank["float_floor"] as num?)?.toDouble() ?? 0;
    final health = (bank["float_health"] ?? "").toString();
    final after = _floatAfter;
    final cashAfter = _cashAfter;

    Color healthColor;
    switch (health) {
      case "CRITICAL_ALERT": healthColor = Colors.red; break;
      case "LOW_ALERT":      healthColor = Colors.orange; break;
      default:               healthColor = Colors.green;
    }

    String? warn;
    Color warnColor = Colors.orange;
    if (after != null) {
      if (txType == "cash_deposit" && after < 0) { warn = "Insufficient float to fund this deposit."; warnColor = Colors.red; }
      else if (txType == "cash_deposit" && after < floor) { warn = "Float will drop below floor — top-up recommended."; }
      else if (txType == "cash_withdrawal") {
        if (cashAfter != null && cashAfter < 0) { warn = "Insufficient cash on hand to pay out this withdrawal."; warnColor = Colors.red; }
        else {
          final ceil = (bank["float_ceiling"] as num?)?.toDouble() ?? double.infinity;
          if (after > ceil) warn = "Float will exceed ceiling — schedule a sweep.";
        }
      }
    }

    Widget row(String k, String v, {Color? color}) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(k, style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color)),
            Text(v, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color)),
          ]),
        );

    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.black.withOpacity(0.03),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(children: [
        row("Current float", "LKR ${_money(bal)}"),
        if (after != null)
          row("Float after ${txType == "cash_deposit" ? "↓" : "↑"}", "LKR ${_money(after)}",
              color: after < floor ? Colors.orange : Colors.green),
        const Divider(height: 14),
        row("Cash on hand", "LKR ${_money(cash)}"),
        if (cashAfter != null)
          row("Cash after ${txType == "cash_deposit" ? "↑" : "↓"}", "LKR ${_money(cashAfter)}",
              color: cashAfter < 0 ? Colors.red : Colors.green),
        const Divider(height: 14),
        row("Health", health.isEmpty ? "—" : health.replaceAll("_", " "), color: healthColor),
        if (warn != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(warn, style: TextStyle(fontSize: 12, color: warnColor)),
          ),
      ]),
    );
  }

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
    if (accountCtrl.text.trim().isEmpty) {
      setState(() => error = "Account number is required.");
      return;
    }
    if (txType == "cash_deposit") {
      if (sourceOfFunds.isEmpty) {
        setState(() => error = "Source of funds is required for deposits.");
        return;
      }
      if (sourceOfFunds == "OTHER" && sourceOtherCtrl.text.trim().isEmpty) {
        setState(() => error = "Please specify the source of funds.");
        return;
      }
    }

    if (needsAmount) {
      final amt = num.tryParse(amountCtrl.text.trim());
      if (amt == null || amt <= 0) {
        setState(() => error = "Please enter a valid amount.");
        return;
      }
      // Per-transaction tier cap (cumulative daily එක backend එකෙන්)
      final lim = _limit;
      if (lim != null && amt > lim) {
        setState(() => error = "Amount exceeds the daily limit of LKR ${_money(lim)}.");
        return;
      }
      // Client-side float guard (backend enforces too)
      final fa = _floatAfter;
      if (txType == "cash_deposit" && fa != null && fa < 0) {
        setState(() => error = "Insufficient float in the selected bank for this deposit.");
        return;
      }
    }

    num parseNum(String s) => s.trim().isEmpty ? 0 : (num.tryParse(s.trim()) ?? 0);

    final payload = <String, dynamic>{
      "customer_name": customerCtrl.text.trim(),
      "customer_phone": phoneCtrl.text.trim(),
      "customer_nic": nicCtrl.text.trim(),
      "account_number": accountCtrl.text.trim(),     // NEW
      "source_of_funds": txType == "cash_deposit"
          ? (sourceOfFunds == "OTHER" ? sourceOtherCtrl.text.trim() : sourceOfFunds)
          : null, // deposits only
      "agent_bank_id": agentBankId,
      "transaction_type": txType,
      "amount": needsAmount ? parseNum(amountCtrl.text) : 0,
      "service_fee": parseNum(feeCtrl.text),
      "commission": parseNum(commissionCtrl.text),
      "status": status,
      "channel": "pos_terminal",
      "created_offline": false,
      "tx_hour": DateTime.now().hour,
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
    final lim = _limit;

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

              // Agent bank (float account) selector
              fieldLabel("Agent Bank (Float Account)"),
              if (loadingBanks)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text("Loading banks…", style: TextStyle(fontSize: 13)),
                )
              else
                DropdownButtonFormField<String?>(
                  value: agentBankId,
                  decoration: const InputDecoration(),
                  items: [
                    const DropdownMenuItem<String?>(
                      value: null, child: Text("— No bank (skip float) —"),
                    ),
                    ...banks.map((b) => DropdownMenuItem<String?>(
                          value: b["id"]?.toString(),
                          child: Text("${b["bank_name"]} — LKR ${_money((b["float_balance"] as num?) ?? 0)}"),
                        )),
                  ],
                  onChanged: saving ? null : (val) => setState(() => agentBankId = val),
                ),
              if (_selectedBank != null) _floatPanel(),
              const SizedBox(height: 16),

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

              // NEW: Customer NIC
              fieldLabel("Customer NIC"),
              TextField(
                controller: nicCtrl,
                enabled: !saving,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(hintText: "e.g. 199012345678"),
              ),
              _hint("Used for daily transaction-count limits (max 5/day per NIC)"),
              const SizedBox(height: 16),

              fieldLabel("Transaction Type *"),
              DropdownButtonFormField<String>(
                value: types.contains(txType) ? txType : types.first,
                decoration: const InputDecoration(),
                items: types.map((o) => DropdownMenuItem(value: o, child: Text(_formatType(o)))).toList(),
                onChanged: saving
                    ? null
                    : (val) {
                        if (val != null) {
                          setState(() {
                            txType = val;
                          });
                        }
                      },
              ),
              const SizedBox(height: 16),

              // NEW: Account Number (mandatory)
              fieldLabel("Account Number *"),
              TextField(
                controller: accountCtrl,
                enabled: !saving,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(hintText: "e.g. 8001234567"),
              ),
              const SizedBox(height: 16),

              // NEW: Source of Funds — deposits only (mandatory dropdown + Other text)
              if (txType == "cash_deposit") ...[
                fieldLabel("Source of Funds *"),
                DropdownButtonFormField<String>(
                  value: sourceOfFunds.isEmpty ? null : sourceOfFunds,
                  decoration: const InputDecoration(hintText: "Select source"),
                  items: kSourceOfFunds
                      .map((o) => DropdownMenuItem(value: o["value"], child: Text(o["label"]!)))
                      .toList(),
                  onChanged: saving ? null : (val) => setState(() => sourceOfFunds = val ?? ""),
                ),
                _hint("Required for deposits (AML record)"),
                if (sourceOfFunds == "OTHER") ...[
                  const SizedBox(height: 12),
                  fieldLabel("Specify Source of Funds *"),
                  TextField(
                    controller: sourceOtherCtrl,
                    enabled: !saving,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: const InputDecoration(hintText: "Describe the source of funds"),
                  ),
                ],
                const SizedBox(height: 16),
              ],

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
                if (lim != null) _hint("Daily limit: LKR ${_money(lim)}"),
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

              if (isEdit) ...[
                const SizedBox(height: 16),
                fieldLabel("Status"),
                DropdownButtonFormField<String>(
                  value: statuses.contains(status) ? status : statuses.first,
                  decoration: const InputDecoration(),
                  items: statuses
                      .map((s) => DropdownMenuItem(value: s, child: Text(s[0].toUpperCase() + s.substring(1))))
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