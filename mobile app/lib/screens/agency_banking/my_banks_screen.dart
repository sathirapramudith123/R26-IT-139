import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../services/agent_bank_service.dart';
import '../inventory/inventory_form_screen.dart' show fieldLabel, errorBox;
import '../../core/i18n.dart';

class MyBanksScreen extends StatefulWidget {
  const MyBanksScreen({super.key});
  @override
  State<MyBanksScreen> createState() => _MyBanksScreenState();
}

class _MyBanksScreenState extends State<MyBanksScreen> {
  List<Map<String, dynamic>> banks = [];
  Map<String, dynamic> pool = {};
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final r = await AgentBankService.fetch();
      if (!mounted) return;
      setState(() {
        banks = r.banks;
        pool = r.pool;
        loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          banks = [];
          loading = false;
        });
      }
    }
  }

  // always two decimals, like money() and the web ("100,000.00", not "100,000")
  String _money(num n) {
    final parts = n.toStringAsFixed(2).split('.');
    final intPart = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return "$intPart.${parts[1]}";
  }

  Color _healthColor(String h) {
    switch (h) {
      case "CRITICAL_ALERT":
        return Colors.red;
      case "LOW_ALERT":
        return Colors.orange;
      default:
        return Colors.green;
    }
  }

  double _totalFloat() => banks.fold(0.0, (s, b) => s + ((b["float_balance"] as num?)?.toDouble() ?? 0));
  num _poolValue(String key) => (pool[key] as num?) ?? 0;

  Future<void> _addCash() async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _AddCashSheet(current: _poolValue("cash_on_hand")),
    );
    if (ok == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final teal = Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;
    return Scaffold(
      appBar: AppBar(title: Text(tr("My Banks"))),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: teal,
        icon: const Icon(Icons.add),
        label: Text(tr("Add Bank")),
        onPressed: () async {
          final ok = await showModalBottomSheet<bool>(
            context: context,
            isScrollControlled: true,
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
                  Row(
                    children: [
                      Expanded(child: _statCard(tr("Total Float (all banks)"), "LKR ${_money(_totalFloat())}", teal)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _statCard(
                          tr("Available for Top-up"),
                          pool.isEmpty ? "—" : "LKR ${_money(_poolValue("available_for_topup"))}",
                          KadeColors.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _cashPoolCard(teal),
                  const SizedBox(height: 16),
                  if (banks.isEmpty)
                    Padding(
                      padding: EdgeInsets.only(top: 80),
                      child: Center(child: Text(tr("No banks yet. Add your first float account."))),
                    )
                  else
                    ...banks.map(_bankCard),
                ],
              ),
            ),
    );
  }

  // The one shared cash pool: cash on hand, reserve, and an Add Cash button
  Widget _cashPoolCard(Color teal) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Theme.of(context).cardColor,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
    ),
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                tr("Cash on Hand (shared pool)"),
                style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color),
              ),
              const SizedBox(height: 4),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  pool.isEmpty ? "—" : "LKR ${_money(_poolValue("cash_on_hand"))}",
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              if (pool.isNotEmpty)
                Text(
                  "LKR ${_money(_poolValue("reserve_floor"))} ${tr("reserved for daily ops")}",
                  style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color),
                ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        FilledButton.tonalIcon(icon: const Icon(Icons.add, size: 18), label: Text(tr("Add Cash")), onPressed: _addCash),
      ],
    ),
  );

  Widget _statCard(String label, String value, Color? color) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Theme.of(context).cardColor,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          tr(label),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color),
        ),
        const SizedBox(height: 4),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
          ),
        ),
      ],
    ),
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
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      b["bank_name"]?.toString() ?? tr("Bank"),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      "${b["risk_tier"]} risk tier",
                      style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: hc.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                child: Text(
                  health.isEmpty ? "—" : health.replaceAll("_", " "),
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: hc),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _miniStat(
                  tr("Float balance"),
                  "LKR ${_money((b["float_balance"] as num?) ?? 0)}",
                  KadeColors.teal,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(child: _miniStat(tr("Float floor"), "LKR ${_money((b["float_floor"] as num?) ?? 0)}", null)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Float is at ${util.toStringAsFixed(0)}% of floor",
                style: TextStyle(fontSize: 11, color: Theme.of(context).textTheme.bodySmall?.color),
              ),
              Text(
                util >= 100 ? tr("Above floor ✓") : tr("Below floor"),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: util >= 100 ? Colors.green : Colors.orange,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: barPct,
              minHeight: 8,
              backgroundColor: Colors.grey.withValues(alpha: 0.2),
              color: util <= 20
                  ? Colors.red
                  : util <= 40
                  ? Colors.orange
                  : Colors.green,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Floor: LKR ${_money(floor)} (100%)", style: const TextStyle(fontSize: 10, color: Colors.grey)),
              Text("Ceiling: LKR ${_money(ceiling)}", style: const TextStyle(fontSize: 10, color: Colors.grey)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.history, size: 18),
                  label: Text(tr("History")),
                  onPressed: () => showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => _LedgerSheet(bank: b),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.add_circle_outline, size: 18),
                  label: Text(tr("Top up")),
                  onPressed: () async {
                    final ok = await showModalBottomSheet<bool>(
                      context: context,
                      isScrollControlled: true,
                      builder: (_) => _TopupSheet(bank: b),
                    );
                    if (ok == true) _load();
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value, Color? color) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(color: Colors.grey.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(10)),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          tr(label),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 10, color: Colors.grey),
        ),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: color),
          ),
        ),
      ],
    ),
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
  final floorCtrl = TextEditingController(text: "50000");
  final ceilingCtrl = TextEditingController(text: "500000");
  String riskTier = "LOW";
  bool saving = false;
  String? error;

  static const tiers = ["LOW", "MEDIUM", "HIGH"];

  @override
  void dispose() {
    nameCtrl.dispose();
    floatCtrl.dispose();
    floorCtrl.dispose();
    ceilingCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (nameCtrl.text.trim().isEmpty) {
      setState(() => error = tr("Bank name is required."));
      return;
    }
    setState(() {
      saving = true;
      error = null;
    });
    num p(String s) => s.trim().isEmpty ? 0 : (num.tryParse(s.trim()) ?? 0);
    try {
      await AgentBankService.create({
        "bank_name": nameCtrl.text.trim(),
        "risk_tier": riskTier,
        "float_balance": p(floatCtrl.text),
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
      padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(tr("Add Bank"), style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],
            fieldLabel(tr("Bank Name *")),
            TextField(
              controller: nameCtrl,
              decoration: InputDecoration(hintText: tr("e.g. Bank of Ceylon")),
            ),
            const SizedBox(height: 14),
            fieldLabel(tr("Risk Tier")),
            DropdownButtonFormField<String>(
              initialValue: riskTier,
              items: tiers.map((t) => DropdownMenuItem(value: t, child: Text(tr(t)))).toList(),
              onChanged: (v) => setState(() => riskTier = v ?? "LOW"),
            ),
            const SizedBox(height: 14),
            // cash on hand is one shared pool — added from the My Banks screen, not per bank
            fieldLabel(tr("Opening Float")),
            TextField(
              controller: floatCtrl,
              keyboardType: TextInputType.number,
              inputFormatters: digits,
              decoration: InputDecoration(prefixText: tr("LKR "), hintText: "100000"),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      fieldLabel(tr("Float Floor")),
                      TextField(
                        controller: floorCtrl,
                        keyboardType: TextInputType.number,
                        inputFormatters: digits,
                        decoration: InputDecoration(prefixText: tr("LKR ")),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      fieldLabel(tr("Float Ceiling")),
                      TextField(
                        controller: ceilingCtrl,
                        keyboardType: TextInputType.number,
                        inputFormatters: digits,
                        decoration: InputDecoration(prefixText: tr("LKR ")),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: teal,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: saving ? null : _save,
                child: saving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(
                        tr("Add Bank"),
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/* ------------------------------- Top-up sheet ------------------------------- */
// Add physical cash to the shared pool
class _AddCashSheet extends StatefulWidget {
  final num current; // cash in the pool now
  const _AddCashSheet({required this.current});
  @override
  State<_AddCashSheet> createState() => _AddCashSheetState();
}

class _AddCashSheetState extends State<_AddCashSheet> {
  final amountCtrl = TextEditingController();
  bool saving = false;
  String? error;

  // always two decimals, like money() and the web ("100,000.00", not "100,000")
  String _money(num n) {
    final parts = n.toStringAsFixed(2).split('.');
    final intPart = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return "$intPart.${parts[1]}";
  }

  @override
  void dispose() {
    amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final amt = num.tryParse(amountCtrl.text.trim()) ?? 0;
    if (amt <= 0) {
      setState(() => error = tr("Enter an amount greater than 0."));
      return;
    }
    setState(() {
      saving = true;
      error = null;
    });
    try {
      await AgentBankService.addCash(amt);
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
    final bal = widget.current;
    final amt = num.tryParse(amountCtrl.text.trim()) ?? 0;
    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(tr("Add Cash to Pool"), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(
            tr("Cash you have in hand (e.g. withdrawn from a bank). Shared by all banks for top-ups."),
            style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color),
          ),
          const SizedBox(height: 14),
          if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(tr("Current cash pool")),
                    Text("LKR ${_money(bal)}", style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                if (amt > 0) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(tr("After adding")),
                      Text(
                        "LKR ${_money(bal + amt)}",
                        style: TextStyle(fontWeight: FontWeight.bold, color: teal),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          fieldLabel(tr("Cash Amount (LKR)")),
          TextField(
            controller: amountCtrl,
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
            decoration: InputDecoration(prefixText: tr("LKR "), hintText: "50000"),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: teal, padding: const EdgeInsets.symmetric(vertical: 14)),
              onPressed: saving ? null : _save,
              child: saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      tr("Add Cash"),
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

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

  // always two decimals, like money() and the web ("100,000.00", not "100,000")
  String _money(num n) {
    final parts = n.toStringAsFixed(2).split('.');
    final intPart = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return "$intPart.${parts[1]}";
  }

  @override
  void dispose() {
    amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final amt = num.tryParse(amountCtrl.text.trim()) ?? 0;
    if (amt <= 0) {
      setState(() => error = tr("Enter an amount greater than 0."));
      return;
    }
    setState(() {
      saving = true;
      error = null;
    });
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
      padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Top up — ${widget.bank["bank_name"]}",
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            tr("Move physical cash into this float account."),
            style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.bodySmall?.color),
          ),
          const SizedBox(height: 14),
          if (error != null) ...[errorBox(error!), const SizedBox(height: 12)],
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(tr("Current float")),
                    Text("LKR ${_money(bal)}", style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                if (amt > 0) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(tr("After top-up")),
                      Text(
                        "LKR ${_money(bal + amt)}",
                        style: TextStyle(fontWeight: FontWeight.bold, color: teal),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          fieldLabel(tr("Top-up Amount (LKR)")),
          TextField(
            controller: amountCtrl,
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}'))],
            decoration: InputDecoration(prefixText: tr("LKR "), hintText: "50000"),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: teal, padding: const EdgeInsets.symmetric(vertical: 14)),
              onPressed: saving ? null : _save,
              child: saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      tr("Top up"),
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
            ),
          ),
        ],
      ),
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
      final list = (d["entries"] is List)
          ? (d["entries"] as List).cast<Map<String, dynamic>>()
          : <Map<String, dynamic>>[];
      if (!mounted) return;
      setState(() {
        entries = list;
        loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          entries = [];
          loading = false;
        });
      }
    }
  }

  // always two decimals, like money() and the web ("100,000.00", not "100,000")
  String _money(num n) {
    final parts = n.toStringAsFixed(2).split('.');
    final intPart = parts[0].replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return "$intPart.${parts[1]}";
  }

  // every float event the backend writes (sql/atomic_banking.sql), translated
  String _label(String type) => switch (type) {
    "DEPOSIT" => tr("Customer deposit"),
    "WITHDRAWAL" => tr("Customer withdrawal"),
    "TOPUP" => tr("Float top-up"),
    "DEPOSIT_REVERSAL" => tr("Deposit reversed"),
    "WITHDRAWAL_REVERSAL" => tr("Withdrawal reversed"),
    _ => type.replaceAll("_", " "),
  };

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Float statement — ${widget.bank["bank_name"]}",
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(tr("Current float")),
                Text(
                  "LKR ${_money((widget.bank["float_balance"] as num?) ?? 0)}",
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 30),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (entries.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 30),
              child: Center(child: Text(tr("No float movements yet."))),
            )
          else
            ConstrainedBox(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.5),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: entries.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final e = entries[i];
                  final inflow = e["flow"] == "in";
                  final amt = (e["amount"] as num?) ?? 0;
                  final bal = e["balance_after"] as num?;
                  final color = inflow ? Colors.green : Colors.red;
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: color.withValues(alpha: 0.12),
                          child: Icon(inflow ? Icons.south_west : Icons.north_east, size: 16, color: color),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _label(e["event_type"]?.toString() ?? ""),
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                              ),
                              Text(
                                DateTime.tryParse(e["date"]?.toString() ?? "")?.toString().substring(0, 16) ?? "",
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              "${inflow ? "+" : "−"}LKR ${_money(amt)}",
                              style: TextStyle(fontWeight: FontWeight.bold, color: color),
                            ),
                            if (bal != null)
                              Text("Bal: ${_money(bal)}", style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
