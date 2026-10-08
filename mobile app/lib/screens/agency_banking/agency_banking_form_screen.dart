import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../services/crud_service.dart';
import '../../services/agent_bank_service.dart';
import '../../services/bank_account_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox, saveButton;
import '../../core/i18n.dart';

/// Tiered CBSL daily limits (LKR) — keep identical to the backend
/// agencyBanking.controller.js TIER_LIMITS. `null` = no limit.
// Rural agent build: fixed LOW-tier daily limits (no KYC dropdown).
const Map<String, num?> kDailyLimits = {"cash_deposit": 50000, "cash_withdrawal": 25000, "fund_transfer": 50000};

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
  final nicCtrl = TextEditingController(); // NEW
  final accountCtrl = TextEditingController(); // NEW (mandatory)
  final sourceOtherCtrl = TextEditingController(); // free text when "OTHER"
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
  String? agentBankId; // NEW
  bool loadingBanks = true;

  // Dummy bank: the customer's registered account, the withdrawal OTP and a balance inquiry
  Map<String, dynamic>? account;
  bool lookingUp = false;
  String? lookupError;
  Map<String, dynamic>? otp; // { otp_id, expires_at, sent_to }
  final otpCtrl = TextEditingController();
  bool otpBusy = false;
  String? notice;
  Timer? _ticker;
  bool get lockedToAccount => isEdit && widget.item?["bank_account_id"] != null;

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
    status = (it?["status"]?.toString().isNotEmpty ?? false) ? it!["status"].toString() : "completed";
    nicCtrl.text = it?["customer_nic"]?.toString() ?? "";
    agentBankId = it?["agent_bank_id"]?.toString();
    _loadBanks();
    // a new account number needs a new lookup (and a new OTP)
    accountCtrl.addListener(() {
      if (account != null && account!["account_number"] != accountCtrl.text.trim()) _resetAccount();
    });
    // OTP countdown
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (otp != null && mounted) setState(() {});
    });
  }

  void _resetAccount() => setState(() {
    account = null;
    lookupError = null;
    otp = null;
    otpCtrl.clear();
  });

  int get _otpLeft {
    final exp = DateTime.tryParse("${otp?["expires_at"] ?? ""}");
    if (exp == null) return 0;
    final left = exp.difference(DateTime.now()).inSeconds;
    return left < 0 ? 0 : left;
  }

  Future<void> _verifyAccount() async {
    if (agentBankId == null || accountCtrl.text.trim().isEmpty) {
      setState(() => lookupError = tr("Select a bank and enter the account number."));
      return;
    }
    setState(() {
      lookingUp = true;
      lookupError = null;
      notice = null;
    });
    try {
      final a = await BankAccountService.lookup(agentBankId!, accountCtrl.text.trim());
      if (!mounted) return;
      setState(() {
        account = a;
        // the account holder's details come from the bank
        customerCtrl.text = "${a["holder_name"] ?? ""}";
        phoneCtrl.text = "${a["phone"] ?? ""}";
        nicCtrl.text = "${a["holder_nic"] ?? ""}";
      });
    } catch (e) {
      if (mounted) setState(() => lookupError = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => lookingUp = false);
    }
  }

  Future<void> _balanceInquiry() async {
    if (account == null) return;
    try {
      final a = await BankAccountService.balanceInquiry("${account!["id"]}");
      if (!mounted) return;
      setState(() {
        account = a;
        notice = "${tr("Balance sent to the customer by SMS")} (${a["phone_masked"]}).";
      });
    } catch (e) {
      if (mounted) setState(() => notice = e.toString().replaceFirst("Exception: ", ""));
    }
  }

  Future<void> _sendOtp() async {
    final amt = num.tryParse(amountCtrl.text.trim()) ?? 0;
    if (account == null || amt <= 0) return;
    setState(() {
      otpBusy = true;
      notice = null;
    });
    try {
      final o = await BankAccountService.sendOtp("${account!["id"]}", amt);
      if (!mounted) return;
      setState(() {
        otp = o;
        otpCtrl.clear();
        notice = "${tr("OTP sent to the customer's phone")} ${o["sent_to"]}.";
      });
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => otpBusy = false);
    }
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
    otpCtrl.dispose();
    _ticker?.cancel();
    feeCtrl.dispose();
    commissionCtrl.dispose();
    super.dispose();
  }

  String _formatType(String text) {
    return text
        .replaceAll("_", " ")
        .split(' ')
        .map((str) {
          if (str.isEmpty) return "";
          return str[0].toUpperCase() + str.substring(1);
        })
        .join(' ');
  }

  // always two decimals, like money() and the web ("100,000.00", not "100,000")
  String _money(num n) {
    final parts = n.toStringAsFixed(2).split('.');
    final intPart = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return "$intPart.${parts[1]}";
  }

  void _onAmountChanged(String val) {
    if (otp != null) {
      otp = null;
      otpCtrl.clear();
    }
    final amt = num.tryParse(val.trim()) ?? 0;
    if (!isEdit && amt > 0) {
      final fee = (amt * 0.002) < 20 ? 20.0 : (amt * 0.002);
      feeCtrl.text = fee.toStringAsFixed(2);
      commissionCtrl.text = (amt * 0.005).toStringAsFixed(2);
    }
    setState(() {}); // refresh live float panel
  }

  // the customer's account at the dummy bank: balance, balance inquiry and the withdrawal OTP
  Widget _accountCard() {
    final a = account!;
    final bal = ((a["balance"] as num?) ?? 0).toDouble();
    final amt = num.tryParse(amountCtrl.text.trim()) ?? 0;
    final after = txType == "cash_deposit" ? bal + amt : bal - amt;
    final soft = Theme.of(context).textTheme.bodySmall;
    final left = _otpLeft;
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: KadeColors.success.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(KadeRadius.md),
        border: Border.all(color: KadeColors.success.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified_user_outlined, size: 16, color: KadeColors.success),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  "${tr("Account verified")} · ${a["bank_name"]}",
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: KadeColors.success),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text("${a["holder_name"]}", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          Text("A/C ${a["account_number"]} · ${a["phone_masked"]}", style: soft),
          const SizedBox(height: 8),
          Text(tr("Available balance"), style: soft),
          Text(
            "LKR ${_money(bal)}",
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: KadeColors.success),
          ),
          if (amt > 0 && (txType == "cash_deposit" || txType == "cash_withdrawal"))
            Text(
              "${tr("After this transaction:")} LKR ${_money(after)}",
              style: soft?.copyWith(color: after < 0 ? KadeColors.terra : null, fontWeight: FontWeight.w600),
            ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _balanceInquiry,
            icon: const Icon(Icons.sms_outlined, size: 16),
            label: Text(tr("Balance inquiry (SMS to customer)")),
          ),
          if (notice != null) Text(notice!, style: const TextStyle(fontSize: 12, color: KadeColors.success)),
          if (txType == "cash_withdrawal") ...[
            const Divider(height: 20),
            Text(
              tr("Customer OTP required for withdrawals"),
              style: const TextStyle(fontWeight: FontWeight.w600, color: KadeColors.amber),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: KadeColors.amber),
                  onPressed: otpBusy || amt <= 0 || amt > bal ? null : _sendOtp,
                  child: Text(otpBusy ? tr("Sending…") : (otp != null ? tr("Resend OTP") : tr("Send OTP"))),
                ),
                if (otp != null) ...[
                  const SizedBox(width: 10),
                  SizedBox(
                    width: 120,
                    child: TextField(
                      controller: otpCtrl,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      textAlign: TextAlign.center,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      style: const TextStyle(fontSize: 18, letterSpacing: 4, fontWeight: FontWeight.w700),
                      decoration: const InputDecoration(hintText: "••••••", counterText: "", isDense: true),
                    ),
                  ),
                ],
              ],
            ),
            if (otp != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  left > 0
                      ? "${tr("Expires in")} ${left ~/ 60}:${(left % 60).toString().padLeft(2, "0")}"
                      : tr("Expired"),
                  style: TextStyle(fontSize: 12, color: left > 0 ? null : KadeColors.terra),
                ),
              ),
            if (amt <= 0) _hint(tr("Enter the amount first.")),
          ],
        ],
      ),
    );
  }

  Widget _hint(String text) => Padding(
    padding: const EdgeInsets.only(top: 6, left: 2),
    child: Text(tr(text), style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color)),
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
      case "CRITICAL_ALERT":
        healthColor = Colors.red;
        break;
      case "LOW_ALERT":
        healthColor = Colors.orange;
        break;
      default:
        healthColor = Colors.green;
    }

    String? warn;
    Color warnColor = Colors.orange;
    if (after != null) {
      if (txType == "cash_deposit" && after < 0) {
        warn = tr("Insufficient float to fund this deposit.");
        warnColor = Colors.red;
      } else if (txType == "cash_deposit" && after < floor) {
        warn = tr("Float will drop below floor — top-up recommended.");
      } else if (txType == "cash_withdrawal") {
        if (cashAfter != null && cashAfter < 0) {
          warn = tr("Insufficient cash on hand to pay out this withdrawal.");
          warnColor = Colors.red;
        } else {
          final ceil = (bank["float_ceiling"] as num?)?.toDouble() ?? double.infinity;
          if (after > ceil) warn = tr("Float will exceed ceiling — schedule a sweep.");
        }
      }
    }

    Widget row(String k, String v, {Color? color}) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(tr(k), style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color)),
          Text(
            tr(v),
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );

    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.black.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          row(tr("Current float"), "LKR ${_money(bal)}"),
          if (after != null)
            row(
              "Float after ${txType == "cash_deposit" ? "↓" : "↑"}",
              "LKR ${_money(after)}",
              color: after < floor ? Colors.orange : Colors.green,
            ),
          const Divider(height: 14),
          row(tr("Cash on hand"), "LKR ${_money(cash)}"),
          if (cashAfter != null)
            row(
              "Cash after ${txType == "cash_deposit" ? "↑" : "↓"}",
              "LKR ${_money(cashAfter)}",
              color: cashAfter < 0 ? Colors.red : Colors.green,
            ),
          const Divider(height: 14),
          row(tr("Health"), health.isEmpty ? "—" : health.replaceAll("_", " "), color: healthColor),
          if (warn != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(tr(warn), style: TextStyle(fontSize: 12, color: warnColor)),
            ),
        ],
      ),
    );
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();

    if (customerCtrl.text.trim().isEmpty) {
      setState(() => error = tr("Customer Name is required."));
      return;
    }
    if (phoneCtrl.text.trim().isEmpty) {
      setState(() => error = tr("Customer Phone is required."));
      return;
    }
    if (phoneCtrl.text.trim().length < 10) {
      setState(() => error = tr("Enter a valid phone number (10 digits)."));
      return;
    }
    if (accountCtrl.text.trim().isEmpty) {
      setState(() => error = tr("Account number is required."));
      return;
    }
    if (txType == "cash_deposit") {
      if (sourceOfFunds.isEmpty) {
        setState(() => error = tr("Source of funds is required for deposits."));
        return;
      }
      if (sourceOfFunds == "OTHER" && sourceOtherCtrl.text.trim().isEmpty) {
        setState(() => error = tr("Please specify the source of funds."));
        return;
      }
    }

    if (needsAmount) {
      final amt = num.tryParse(amountCtrl.text.trim());
      if (amt == null || amt <= 0) {
        setState(() => error = tr("Please enter a valid amount."));
        return;
      }
      // Per-transaction tier cap (the cumulative daily limit is checked by the backend)
      final lim = _limit;
      if (lim != null && amt > lim) {
        setState(() => error = "Amount exceeds the daily limit of LKR ${_money(lim)}.");
        return;
      }
      // Client-side float guard (backend enforces too)
      final fa = _floatAfter;
      if (txType == "cash_deposit" && fa != null && fa < 0) {
        setState(() => error = tr("Insufficient float in the selected bank for this deposit."));
        return;
      }
    }

    // registered account rules (new deposits / withdrawals through a partner bank)
    final cashTxn = txType == "cash_deposit" || txType == "cash_withdrawal";
    if (!isEdit && cashTxn && agentBankId != null) {
      if (account == null) {
        setState(() => error = tr("Verify the customer's account first."));
        return;
      }
      if (txType == "cash_withdrawal") {
        final amt = num.tryParse(amountCtrl.text.trim()) ?? 0;
        if (amt > ((account!["balance"] as num?) ?? 0)) {
          setState(
            () =>
                error = "${tr("Insufficient balance. Available:")} LKR ${_money((account!["balance"] as num?) ?? 0)}.",
          );
          return;
        }
        if (otp == null) {
          setState(() => error = tr("Send an OTP to the customer first."));
          return;
        }
        if (_otpLeft <= 0) {
          setState(() => error = tr("The OTP has expired — send a new one."));
          return;
        }
        if (!RegExp(r'^[0-9]{6}$').hasMatch(otpCtrl.text.trim())) {
          setState(() => error = tr("Enter the 6-digit OTP the customer received."));
          return;
        }
      }
    }

    num parseNum(String s) => s.trim().isEmpty ? 0 : (num.tryParse(s.trim()) ?? 0);

    final payload = <String, dynamic>{
      "customer_name": customerCtrl.text.trim(),
      "customer_phone": phoneCtrl.text.trim(),
      "customer_nic": nicCtrl.text.trim(),
      "account_number": accountCtrl.text.trim(), // NEW
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
      "otp_id": otp?["otp_id"],
      "otp_code": otpCtrl.text.trim().isEmpty ? null : otpCtrl.text.trim(),
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
              if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],

              // Agent bank (float account) selector
              fieldLabel(tr("Agent Bank (Float Account)")),
              if (loadingBanks)
                Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text(tr("Loading banks…"), style: TextStyle(fontSize: 13)),
                )
              else
                DropdownButtonFormField<String?>(
                  initialValue: agentBankId,
                  decoration: const InputDecoration(),
                  items: [
                    DropdownMenuItem<String?>(value: null, child: Text(tr("— No bank (skip float) —"))),
                    ...banks.map(
                      (b) => DropdownMenuItem<String?>(
                        value: b["id"]?.toString(),
                        child: Text("${b["bank_name"]} — LKR ${_money((b["float_balance"] as num?) ?? 0)}"),
                      ),
                    ),
                  ],
                  onChanged: saving
                      ? null
                      : (val) {
                          setState(() => agentBankId = val);
                          _resetAccount();
                        },
                ),
              if (_selectedBank != null) _floatPanel(),
              const SizedBox(height: 16),

              fieldLabel(tr("Customer Name *")),
              TextField(
                controller: customerCtrl,
                enabled: !saving,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(hintText: tr("Enter customer full name")),
              ),
              const SizedBox(height: 16),

              fieldLabel(tr("Customer Phone *")),
              TextField(
                controller: phoneCtrl,
                enabled: !saving,
                keyboardType: TextInputType.phone,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                maxLength: 10,
                decoration: InputDecoration(hintText: tr("07XXXXXXXX"), counterText: ""),
              ),
              const SizedBox(height: 16),

              // NEW: Customer NIC
              fieldLabel(tr("Customer NIC")),
              TextField(
                controller: nicCtrl,
                enabled: !saving,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(hintText: "e.g. 199012345678"),
              ),
              _hint(tr("Used for daily transaction-count limits (max 5/day per NIC)")),
              const SizedBox(height: 16),

              fieldLabel(tr("Transaction Type *")),
              DropdownButtonFormField<String>(
                initialValue: types.contains(txType) ? txType : types.first,
                decoration: const InputDecoration(),
                items: types.map((o) => DropdownMenuItem(value: o, child: Text(tr(_formatType(o))))).toList(),
                onChanged: saving
                    ? null
                    : (val) {
                        if (val != null) {
                          setState(() {
                            txType = val;
                            otp = null;
                            otpCtrl.clear();
                          });
                        }
                      },
              ),
              const SizedBox(height: 16),

              // NEW: Account Number (mandatory)
              fieldLabel(tr("Account Number *")),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: accountCtrl,
                      enabled: !saving && !lockedToAccount,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(hintText: "e.g. 8001234567"),
                      onSubmitted: (_) => _verifyAccount(),
                    ),
                  ),
                  if (agentBankId != null && !lockedToAccount) ...[
                    const SizedBox(width: 8),
                    FilledButton.tonalIcon(
                      onPressed: lookingUp ? null : _verifyAccount,
                      icon: lookingUp
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.search, size: 18),
                      label: Text(tr("Verify")),
                    ),
                  ],
                ],
              ),
              if (lookupError != null)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(lookupError!, style: const TextStyle(color: KadeColors.terra, fontSize: 12)),
                ),
              if (account != null) _accountCard(),
              if (lockedToAccount)
                _hint(
                  tr(
                    "Posted to the customer's account — amount, type, account and bank cannot be changed. Delete the transaction to reverse it.",
                  ),
                ),
              const SizedBox(height: 16),

              // NEW: Source of Funds — deposits only (mandatory dropdown + Other text)
              if (txType == "cash_deposit") ...[
                fieldLabel(tr("Source of Funds *")),
                DropdownButtonFormField<String>(
                  initialValue: sourceOfFunds.isEmpty ? null : sourceOfFunds,
                  decoration: InputDecoration(hintText: tr("Select source")),
                  items: kSourceOfFunds
                      .map((o) => DropdownMenuItem(value: o["value"], child: Text(o["label"]!)))
                      .toList(),
                  onChanged: saving ? null : (val) => setState(() => sourceOfFunds = val ?? ""),
                ),
                _hint(tr("Required for deposits (AML record)")),
                if (sourceOfFunds == "OTHER") ...[
                  const SizedBox(height: 12),
                  fieldLabel(tr("Specify Source of Funds *")),
                  TextField(
                    controller: sourceOtherCtrl,
                    enabled: !saving,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(hintText: tr("Describe the source of funds")),
                  ),
                ],
                const SizedBox(height: 16),
              ],

              if (needsAmount) ...[
                const SizedBox(height: 16),
                fieldLabel(tr("Amount (LKR) *")),
                TextField(
                  controller: amountCtrl,
                  enabled: !saving,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
                  decoration: InputDecoration(hintText: "0.00", prefixText: tr("LKR ")),
                  onChanged: _onAmountChanged,
                ),
                if (lim != null) _hint("Daily limit: LKR ${_money(lim)}"),
              ],

              const SizedBox(height: 16),
              fieldLabel(tr("Service Fee (LKR)")),
              TextField(
                controller: feeCtrl,
                enabled: !saving,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
                decoration: InputDecoration(hintText: "0.00", prefixText: tr("LKR ")),
              ),
              _hint(isEdit ? tr("Charged to the customer") : tr("Auto-filled from amount — you can change it")),

              const SizedBox(height: 16),
              fieldLabel(tr("Commission (LKR)")),
              TextField(
                controller: commissionCtrl,
                enabled: !saving,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
                decoration: InputDecoration(hintText: "0.00", prefixText: tr("LKR ")),
              ),
              _hint(isEdit ? tr("Your payout as agent") : tr("Auto-filled from amount — you can change it")),

              if (isEdit) ...[
                const SizedBox(height: 16),
                fieldLabel(tr("Status")),
                DropdownButtonFormField<String>(
                  initialValue: statuses.contains(status) ? status : statuses.first,
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
