import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import '../../services/bank_account_service.dart';

String _money(num n) {
  final parts = n.toDouble().abs().toStringAsFixed(2).split(".");
  final whole = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ",");
  return "${n < 0 ? "-" : ""}LKR $whole.${parts[1]}";
}

// DEPOSIT -> "Deposit", WITHDRAWAL_REVERSAL -> "Withdrawal reversal" (as on the web), translated
String _entryLabel(String type) {
  final s = type.replaceAll("_", " ").toLowerCase();
  return tr(s.isEmpty ? s : "${s[0].toUpperCase()}${s.substring(1)}");
}

String _time(dynamic v) {
  final d = DateTime.tryParse("${v ?? ""}")?.toLocal();
  if (d == null) return "";
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return "${d.day} ${m[d.month - 1]} ${d.hour.toString().padLeft(2, "0")}:${d.minute.toString().padLeft(2, "0")}";
}

/// Dummy bank accounts of the partner banks — balances refresh every few seconds.
class BankAccountsScreen extends StatefulWidget {
  const BankAccountsScreen({super.key});
  @override
  State<BankAccountsScreen> createState() => _BankAccountsScreenState();
}

class _BankAccountsScreenState extends State<BankAccountsScreen> {
  List<Map<String, dynamic>> accounts = [];
  bool loading = true;
  String? error;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(const Duration(seconds: 4), (_) => _load(quiet: true));
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _load({bool quiet = false}) async {
    try {
      final a = await BankAccountService.list();
      if (mounted) {
        setState(() {
          accounts = a;
          error = null;
        });
      }
    } catch (e) {
      if (mounted && !quiet) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final banks = accounts.map((a) => "${a["bank_name"]}").toSet().toList();
    return Scaffold(
      appBar: AppBar(title: Text(tr("Bank Accounts"))),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(error!, style: const TextStyle(color: KadeColors.terra)),
              ),
            )
          : accounts.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  tr(
                    "No accounts yet. Add a partner bank in 'My Banks' — demo accounts are created for it automatically.",
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    tr("Simulated partner-bank accounts — balances update live with every deposit and withdrawal."),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  for (final bank in banks) ...[
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        const Icon(Icons.account_balance_outlined, size: 18, color: KadeColors.teal),
                        const SizedBox(width: 6),
                        Expanded(child: Text(bank, style: Theme.of(context).textTheme.titleSmall)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    for (final a in accounts.where((x) => x["bank_name"] == bank))
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text("${a["holder_name"]}", style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text("${a["account_number"]} · ${a["phone_masked"]}"),
                          trailing: Text(
                            _money((a["balance"] as num?) ?? 0),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => BankAccountDetailScreen(account: a)),
                          ),
                        ),
                      ),
                  ],
                ],
              ),
            ),
    );
  }
}

/// One account: the customer's phone (simulated SMS inbox) and the statement, refreshing live.
class BankAccountDetailScreen extends StatefulWidget {
  final Map<String, dynamic> account;
  const BankAccountDetailScreen({super.key, required this.account});
  @override
  State<BankAccountDetailScreen> createState() => _BankAccountDetailScreenState();
}

class _BankAccountDetailScreenState extends State<BankAccountDetailScreen> {
  late Map<String, dynamic> account = widget.account;
  List<Map<String, dynamic>> entries = [];
  List<Map<String, dynamic>> messages = [];
  int tab = 0;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(const Duration(seconds: 4), (_) => _load());
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final id = "${widget.account["id"]}";
      final st = await BankAccountService.statement(id);
      final msgs = await BankAccountService.messages(id);
      if (!mounted) return;
      setState(() {
        if (st["account"] is Map) account = Map<String, dynamic>.from(st["account"]);
        entries = (st["entries"] is List)
            ? (st["entries"] as List).whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList()
            : [];
        messages = msgs;
      });
    } catch (_) {
      /* keep the last view */
    }
  }

  Color _kindColor(String k) => switch (k) {
    "OTP" => KadeColors.amber,
    "CREDIT" => KadeColors.success,
    "DEBIT" => KadeColors.terra,
    "BALANCE" => KadeColors.teal,
    _ => Colors.grey,
  };

  @override
  Widget build(BuildContext context) {
    final soft = Theme.of(context).textTheme.bodySmall;
    return Scaffold(
      appBar: AppBar(title: Text("${account["holder_name"]}")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: KadeColors.headerGradient),
              borderRadius: BorderRadius.circular(KadeRadius.lg),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("${account["bank_name"]}", style: const TextStyle(color: Colors.white70, fontSize: 12)),
                Text(
                  "A/C ${account["account_number"]}",
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 10),
                Text(tr("Available balance"), style: const TextStyle(color: Colors.white70, fontSize: 12)),
                Text(
                  _money((account["balance"] as num?) ?? 0),
                  style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w700),
                ),
                Text("${account["phone"]}", style: const TextStyle(color: Colors.white70, fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SegmentedButton<int>(
            segments: [
              ButtonSegment(value: 0, icon: const Icon(Icons.smartphone), label: Text(tr("Customer phone"))),
              ButtonSegment(value: 1, icon: const Icon(Icons.receipt_long), label: Text(tr("Statement"))),
            ],
            selected: {tab},
            onSelectionChanged: (s) => setState(() => tab = s.first),
          ),
          const SizedBox(height: 12),
          if (tab == 0)
            messages.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(30),
                    child: Center(child: Text(tr("No messages yet."), style: soft)),
                  )
                : Column(
                    children: [
                      for (final m in messages)
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: _kindColor("${m["kind"]}").withValues(alpha: 0.08),
                            border: Border.all(color: _kindColor("${m["kind"]}").withValues(alpha: 0.35)),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (m["channel"] == "EMAIL")
                                Text("E-MAIL · ${"${m["delivery"]}".toLowerCase()}", style: soft),
                              Text("${m["body"]}", style: const TextStyle(fontSize: 13)),
                              Align(
                                alignment: Alignment.centerRight,
                                child: Text(_time(m["created_at"]), style: soft),
                              ),
                            ],
                          ),
                        ),
                    ],
                  )
          else
            Card(
              child: Column(
                children: [
                  for (final e in entries)
                    ListTile(
                      dense: true,
                      title: Text(_entryLabel("${e["entry_type"]}")),
                      subtitle: Text("${_time(e["created_at"])}  ${e["note"] ?? ""}"),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            "${((e["amount"] as num?) ?? 0) >= 0 ? "+" : ""}${_money((e["amount"] as num?) ?? 0)}",
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: ((e["amount"] as num?) ?? 0) >= 0 ? KadeColors.success : KadeColors.terra,
                            ),
                          ),
                          Text(_money((e["balance_after"] as num?) ?? 0), style: soft),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          Text(tr("Updates automatically every few seconds."), style: soft),
        ],
      ),
    );
  }
}
