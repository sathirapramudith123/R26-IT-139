import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../services/agent_bank_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox;

class MyBanksScreen extends StatefulWidget {
  const MyBanksScreen({super.key});
  @override
  State<MyBanksScreen> createState() => _MyBanksScreenState();
}

class _MyBanksScreenState extends State<MyBanksScreen> {
  List<Map<String, dynamic>> banks = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final b = await AgentBankService.list();
      if (!mounted) return;
      setState(() { banks = b; loading = false; });
    } catch (_) {
      if (mounted) setState(() { banks = []; loading = false; });
    }
  }

  String _money(num n) {
    final fixed = n == n.roundToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(2);
    final parts = fixed.split('.');
    final intPart = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return parts.length > 1 ? "$intPart.${parts[1]}" : intPart;
  }

  Color _healthColor(String h) {
    switch (h) {
      case "CRITICAL_ALERT": return Colors.red;
      case "LOW_ALERT":      return Colors.orange;
      default:               return Colors.green;
    }
  }

  double _totalFloat() => banks.fold(0.0, (s, b) => s + ((b["float_balance"] as num?)?.toDouble() ?? 0));
  double _totalCash()  => banks.fold(0.0, (s, b) => s + ((b["cash_on_hand"] as num?)?.toDouble() ?? 0));

  @override
  Widget build(BuildContext context) {
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;
    return Scaffold(
      appBar: AppBar(title: const Text("My Banks")),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: teal,
        icon: const Icon(Icons.add),
        label: const Text("Add Bank"),
        onPressed: () async {
          final ok = await showModalBottomSheet<bool>(
            context: context, isScrollControlled: true,
            builder: (_) => const _AddBankSheet(),
          );
          if (ok == true) _load();
        },
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (banks.isNotEmpty) ...[
                    Row(children: [
                      Expanded(child: _statCard("Total Float", "LKR ${_money(_totalFloat())}", teal)),
                      const SizedBox(width: 12),
                      Expanded(child: _statCard("Total Cash", "LKR ${_money(_totalCash())}", null)),
                    ]),
                    const SizedBox(height: 16),
                  ],
                  if (banks.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 80),
                      child: Center(child: Text("No banks yet. Add your first float account.")),
                    )
                  else
                    ...banks.map(_bankCard),
                ],
              ),
            ),
    );
  }

  Widget _statCard(String label, String value, Color? color) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.withOpacity(0.2)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        ]),
      );

  Widget _bankCard(Map<String, dynamic> b) {
    final health = (b["float_health"] ?? "").toString();
    final util = ((b["utilization_pct"] as num?) ?? 0).toDouble();
    final floor = (b["float_floor"] as num?)?.toDouble() ?? 0;
    final ceiling = (b["float_ceiling"] as num?)?.toDouble() ?? 0;
    final barPct = (util > 100 ? 100 : util) / 100;
    final hc = _healthColor(health);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withOpacity(0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(b["bank_name"]?.toString() ?? "Bank",
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text("${b["risk_tier"]} risk tier",
                style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color)),
          ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: hc.withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
            child: Text(health.isEmpty ? "—" : health.replaceAll("_", " "),
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: hc)),
          ),
        ]),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: _miniStat("Float balance", "LKR ${_money((b["float_balance"] as num?) ?? 0)}", KadeColors.teal)),
          const SizedBox(width: 10),
          Expanded(child: _miniStat("Cash on hand", "LKR ${_money((b["cash_on_hand"] as num?) ?? 0)}", null)),
        ]),
        const SizedBox(height: 14),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text("Float is at ${util.toStringAsFixed(0)}% of floor",
              style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color)),
          Text(util >= 100 ? "Above floor ✓" : "Below floor",
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold,
                  color: util >= 100 ? Colors.green : Colors.orange)),
        ]),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: barPct, minHeight: 8,
            backgroundColor: Colors.grey.withOpacity(0.2),
            color: util <= 20 ? Colors.red : util <= 40 ? Colors.orange : Colors.green,
          ),
        ),
        const SizedBox(height: 4),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text("Floor: LKR ${_money(floor)} (100%)", style: const TextStyle(fontSize: 10, color: Colors.grey)),
          Text("Ceiling: LKR ${_money(ceiling)}", style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              icon: const Icon(Icons.history, size: 18),
              label: const Text("History"),
              onPressed: () => showModalBottomSheet(
                context: context, isScrollControlled: true,
                builder: (_) => _LedgerSheet(bank: b),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton.icon(
              icon: const Icon(Icons.add_circle_outline, size: 18),
              label: const Text("Top up"),
              onPressed: () async {
                final ok = await showModalBottomSheet<bool>(
                  context: context, isScrollControlled: true,
                  builder: (_) => _TopupSheet(bank: b),
                );
                if (ok == true) _load();
              },
            ),
          ),
        ]),
      ]),
    );
  }

  Widget _miniStat(String label, String value, Color? color) => Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.grey.withOpacity(0.08), borderRadius: BorderRadius.circular(10),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: color)),
        ]),
      );
}

/* ------------------------------- Add Bank sheet ------------------------------- */
class _AddBankSheet extends StatefulWidget {
  const _AddBankSheet();
  @override
  State<_AddBankSheet> createState() => _AddBankSheetState();
}

class _AddBankSheetState extends State<_AddBankSheet> {
  final nameCtrl = TextEditingController();
  final floatCtrl = TextEditingController();
  final cashCtrl = TextEditingController();
  final floorCtrl = TextEditingController(text: "50000");
  final ceilingCtrl = TextEditingController(text: "500000");
  String riskTier = "LOW";
  bool saving = false;
  String? error;

  static const tiers = ["LOW", "MEDIUM", "HIGH"];

  @override
  void dispose() {
    nameCtrl.dispose(); floatCtrl.dispose(); cashCtrl.dispose();
    floorCtrl.dispose(); ceilingCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (nameCtrl.text.trim().isEmpty) { setState(() => error = "Bank name is required."); return; }
    setState(() { saving = true; error = null; });
    num p(String s) => s.trim().isEmpty ? 0 : (num.tryParse(s.trim()) ?? 0);
    try {
      await AgentBankService.create({
        "bank_name": nameCtrl.text.trim(),
        "risk_tier": riskTier,
        "float_balance": p(floatCtrl.text),
        "cash_on_hand": p(cashCtrl.text),
        "float_floor": p(floorCtrl.text),
        "float_ceiling": p(ceilingCtrl.text),
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;
    final digits = [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))];
    return Padding(
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text("Add Bank", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],
          fieldLabel("Bank Name *"),
          TextField(controller: nameCtrl, decoration: const InputDecoration(hintText: "e.g. Bank of Ceylon")),
          const SizedBox(height: 14),
          fieldLabel("Risk Tier"),
          DropdownButtonFormField<String>(
            value: riskTier,
            items: tiers.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
            onChanged: (v) => setState(() => riskTier = v ?? "LOW"),
          ),
          const SizedBox(height: 14),
          Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              fieldLabel("Opening Float"),
              TextField(controller: floatCtrl, keyboardType: TextInputType.number, inputFormatters: digits,
                  decoration: const InputDecoration(prefixText: "LKR ", hintText: "100000")),
            ])),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              fieldLabel("Cash on Hand"),
              TextField(controller: cashCtrl, keyboardType: TextInputType.number, inputFormatters: digits,
                  decoration: const InputDecoration(prefixText: "LKR ", hintText: "50000")),
            ])),
          ]),
          const SizedBox(height: 14),
          Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              fieldLabel("Float Floor"),
              TextField(controller: floorCtrl, keyboardType: TextInputType.number, inputFormatters: digits,
                  decoration: const InputDecoration(prefixText: "LKR ")),
            ])),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              fieldLabel("Float Ceiling"),
              TextField(controller: ceilingCtrl, keyboardType: TextInputType.number, inputFormatters: digits,
                  decoration: const InputDecoration(prefixText: "LKR ")),
            ])),
          ]),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: teal, padding: const EdgeInsets.symmetric(vertical: 14)),
              onPressed: saving ? null : _save,
              child: saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text("Add Bank", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ),
        ]),
      ),
    );
  }
}

/* ------------------------------- Top-up sheet ------------------------------- */
class _TopupSheet extends StatefulWidget {
  final Map<String, dynamic> bank;
  const _TopupSheet({required this.bank});
  @override
  State<_TopupSheet> createState() => _TopupSheetState();
}

class _TopupSheetState extends State<_TopupSheet> {
  final amountCtrl = TextEditingController();
  bool saving = false;
  String? error;

  String _money(num n) {
    final fixed = n == n.roundToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(2);
    final parts = fixed.split('.');
    final intPart = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return parts.length > 1 ? "$intPart.${parts[1]}" : intPart;
  }

  @override
  void dispose() { amountCtrl.dispose(); super.dispose(); }

  Future<void> _save() async {
    final amt = num.tryParse(amountCtrl.text.trim()) ?? 0;
    if (amt <= 0) { setState(() => error = "Enter an amount greater than 0."); return; }
    setState(() { saving = true; error = null; });
    try {
      await AgentBankService.topup(widget.bank["id"].toString(), amt);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;
    final bal = (widget.bank["float_balance"] as num?)?.toDouble() ?? 0;
    final amt = num.tryParse(amountCtrl.text.trim()) ?? 0;
    return Padding(
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text("Top up — ${widget.bank["bank_name"]}", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text("Move physical cash into this float account.",
            style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color)),
        const SizedBox(height: 14),
        if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.grey.withOpacity(0.08), borderRadius: BorderRadius.circular(10)),
          child: Column(children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text("Current float"), Text("LKR ${_money(bal)}", style: const TextStyle(fontWeight: FontWeight.bold)),
            ]),
            if (amt > 0) ...[
              const SizedBox(height: 4),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text("After top-up"),
                Text("LKR ${_money(bal + amt)}", style: TextStyle(fontWeight: FontWeight.bold, color: teal)),
              ]),
            ],
          ]),
        ),
        const SizedBox(height: 14),
        fieldLabel("Top-up Amount (LKR)"),
        TextField(
          controller: amountCtrl, autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
          decoration: const InputDecoration(prefixText: "LKR ", hintText: "50000"),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: teal, padding: const EdgeInsets.symmetric(vertical: 14)),
            onPressed: saving ? null : _save,
            child: saving
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text("Top up", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ),
      ]),
    );
  }
}

/* ------------------------------- Float ledger (statement) sheet ------------------------------- */
class _LedgerSheet extends StatefulWidget {
  final Map<String, dynamic> bank;
  const _LedgerSheet({required this.bank});
  @override
  State<_LedgerSheet> createState() => _LedgerSheetState();
}

class _LedgerSheetState extends State<_LedgerSheet> {
  bool loading = true;
  List<Map<String, dynamic>> entries = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await AgentBankService.ledger(widget.bank["id"].toString());
      final list = (d["entries"] is List) ? (d["entries"] as List).cast<Map<String, dynamic>>() : <Map<String, dynamic>>[];
      if (!mounted) return;
      setState(() { entries = list; loading = false; });
    } catch (_) {
      if (mounted) setState(() { entries = []; loading = false; });
    }
  }

  String _money(num n) {
    final fixed = n == n.roundToDouble() ? n.toStringAsFixed(0) : n.toStringAsFixed(2);
    final parts = fixed.split('.');
    final intPart = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return parts.length > 1 ? "$intPart.${parts[1]}" : intPart;
  }

  String _label(String type) {
    switch (type) {
      case "DEPOSIT": return "Customer deposit";
      case "WITHDRAWAL": return "Customer withdrawal";
      case "TOPUP": return "Float top-up";
      default: return type;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text("Float statement — ${widget.bank["bank_name"]}",
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(color: Colors.grey.withOpacity(0.08), borderRadius: BorderRadius.circular(10)),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text("Current float"),
            Text("LKR ${_money((widget.bank["float_balance"] as num?) ?? 0)}",
                style: const TextStyle(fontWeight: FontWeight.bold)),
          ]),
        ),
        const SizedBox(height: 12),
        if (loading)
          const Padding(padding: EdgeInsets.symmetric(vertical: 30), child: Center(child: CircularProgressIndicator()))
        else if (entries.isEmpty)
          const Padding(padding: EdgeInsets.symmetric(vertical: 30), child: Center(child: Text("No float movements yet.")))
        else
          ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.5),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: entries.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final e = entries[i];
                final inflow = e["flow"] == "in";
                final amt = (e["amount"] as num?) ?? 0;
                final bal = e["balance_after"] as num?;
                final color = inflow ? Colors.green : Colors.red;
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.withOpacity(0.2)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(children: [
                    CircleAvatar(
                      radius: 16, backgroundColor: color.withOpacity(0.12),
                      child: Icon(inflow ? Icons.south_west : Icons.north_east, size: 16, color: color),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(_label(e["event_type"]?.toString() ?? ""),
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      Text(DateTime.tryParse(e["date"]?.toString() ?? "")?.toString().substring(0, 16) ?? "",
                          style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ])),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text("${inflow ? "+" : "−"}LKR ${_money(amt)}",
                          style: TextStyle(fontWeight: FontWeight.bold, color: color)),
                      if (bal != null)
                        Text("Bal: ${_money(bal)}", style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ]),
                  ]),
                );
              },
            ),
          ),
      ]),
    );
  }
}