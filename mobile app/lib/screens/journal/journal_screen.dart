import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/journal_service.dart';
import '../../core/i18n.dart';
import '../common/record_details.dart' show money, qtyOf, numOf;

/// General Journal & Reports — same as the web page: a date range, then three tabs
/// (double-entry Journal, Goods Movement, Profit & Loss).
class JournalScreen extends StatefulWidget {
  const JournalScreen({super.key});
  @override
  State<JournalScreen> createState() => _JournalScreenState();
}

class _JournalScreenState extends State<JournalScreen> {
  // default range = current month (device timezone, i.e. Sri Lanka days)
  late DateTime from = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime to = DateTime.now();
  int tab = 0; // 0 journal, 1 ledger, 2 goods, 3 profit & loss
  String? ledgerAccount; // account open in the Ledger tab
  bool loading = true;
  Map<String, dynamic>? data;

  static String _ymd(DateTime d) =>
      "${d.year}-${d.month.toString().padLeft(2, "0")}-${d.day.toString().padLeft(2, "0")}";

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final d = await JournalService.get(from: _ymd(from), to: _ymd(to));
      if (mounted) setState(() => data = d.isEmpty ? null : d);
    } catch (_) {
      if (mounted) setState(() => data = null);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _pick(bool isFrom) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isFrom ? from : to,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked == null) return;
    setState(() {
      if (isFrom) {
        from = picked;
        if (to.isBefore(from)) to = from;
      } else {
        to = picked;
        if (from.isAfter(to)) from = to;
      }
    });
    _load();
  }

  void _quick(DateTime f) {
    setState(() {
      from = f;
      to = DateTime.now();
    });
    _load();
  }

  Color get _primary => Theme.of(context).brightness == Brightness.dark ? KadeColors.tealDark : KadeColors.teal;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    return Scaffold(
      appBar: AppBar(title: Text(tr("Journal"))),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _hero(),
            const SizedBox(height: 14),
            _rangeCard(now),
            const SizedBox(height: 14),
            _tabs(),
            const SizedBox(height: 14),
            if (loading)
              const Padding(
                padding: EdgeInsets.only(top: 60),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (data == null)
              _empty(tr("No data for this range."))
            else if (tab == 0)
              ..._journalTab()
            else if (tab == 1)
              ..._ledgerTab()
            else if (tab == 2)
              ..._goodsTab()
            else
              ..._pnlTab(),
          ],
        ),
      ),
    );
  }

  /* ------------------------------ header + filters ------------------------------ */

  Widget _hero() => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      gradient: const LinearGradient(colors: KadeColors.headerGradient),
      borderRadius: BorderRadius.circular(KadeRadius.lg),
    ),
    child: Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.18),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.menu_book_outlined, color: Colors.white),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                tr("General Journal & Reports"),
                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 2),
              Text(
                tr("Double-entry records, goods movement and profit / loss."),
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  Widget _rangeCard(DateTime now) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: _dateBox(tr("From"), from, () => _pick(true))),
              const SizedBox(width: 10),
              Expanded(child: _dateBox(tr("To"), to, () => _pick(false))),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: [
              ActionChip(label: Text(tr("This month")), onPressed: () => _quick(DateTime(now.year, now.month, 1))),
              ActionChip(
                label: Text(tr("Last 7 days")),
                onPressed: () => _quick(DateTime(now.year, now.month, now.day - 6)),
              ),
            ],
          ),
        ],
      ),
    ),
  );

  Widget _dateBox(String label, DateTime d, VoidCallback onTap) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: Theme.of(context).textTheme.bodySmall),
      const SizedBox(height: 4),
      InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(KadeRadius.md),
        child: InputDecorator(
          decoration: const InputDecoration(isDense: true, suffixIcon: Icon(Icons.calendar_today_outlined, size: 18)),
          child: Text(_ymd(d)),
        ),
      ),
    ],
  );

  Widget _tabs() {
    final items = [
      (tr("Journal"), Icons.description_outlined),
      (tr("Ledger"), Icons.account_balance_wallet_outlined),
      (tr("Goods Movement"), Icons.inventory_2_outlined),
      (tr("Profit & Loss"), Icons.balance_outlined),
    ];
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: dark ? KadeColors.surfaceMutedDark : KadeColors.surfaceMutedLight,
        borderRadius: BorderRadius.circular(KadeRadius.md),
      ),
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++)
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() => tab = i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 4),
                  decoration: BoxDecoration(
                    color: tab == i ? Theme.of(context).cardColor : Colors.transparent,
                    borderRadius: BorderRadius.circular(KadeRadius.sm),
                    boxShadow: tab == i ? const [BoxShadow(color: KadeColors.cardShadow, blurRadius: 6)] : null,
                  ),
                  child: Column(
                    children: [
                      Icon(items[i].$2, size: 18, color: tab == i ? _primary : Colors.grey),
                      const SizedBox(height: 2),
                      Text(
                        items[i].$1,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          height: 1.15,
                          fontWeight: FontWeight.w600,
                          color: tab == i ? _primary : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /* --------------------------------- Journal tab -------------------------------- */

  List<Widget> _journalTab() {
    final days = (data!["days"] is List) ? (data!["days"] as List).whereType<Map>().toList() : <Map>[];
    if (days.isEmpty) return [_empty(tr("No journal entries in this range."))];
    return [
      if (data!["totals"] is Map) _balanceBanner(data!["totals"] as Map, tr("Range total")),
      for (final d in days) ...[const SizedBox(height: 12), _dayCard(d)],
    ];
  }

  Widget _dayCard(Map d) {
    final entries = (d["entries"] is List) ? (d["entries"] as List).whereType<Map>().toList() : <Map>[];
    final soft = Theme.of(context).textTheme.bodySmall?.color;
    final muted = Theme.of(context).brightness == Brightness.dark
        ? KadeColors.surfaceMutedDark
        : KadeColors.surfaceMutedLight;
    const mono = TextStyle(fontSize: 12, fontFeatures: [FontFeature.tabularFigures()]);
    return Card(
      clipBehavior: Clip.antiAlias,
      margin: EdgeInsets.zero,
      child: Column(
        children: [
          Container(
            color: muted,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Expanded(
                  child: Text("${d["date"]}", style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                Flexible(
                  child: Text(
                    "${tr("Dr")} ${money(d["total_debit"])} ${tr("· Cr")} ${money(d["total_credit"])}",
                    textAlign: TextAlign.right,
                    style: TextStyle(fontSize: 11, color: soft),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: Row(
              children: [
                Expanded(
                  flex: 5,
                  child: Text(tr("Particulars"), style: TextStyle(fontSize: 11, color: soft)),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    tr("Debit"),
                    textAlign: TextAlign.right,
                    style: TextStyle(fontSize: 11, color: soft),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    tr("Credit"),
                    textAlign: TextAlign.right,
                    style: TextStyle(fontSize: 11, color: soft),
                  ),
                ),
              ],
            ),
          ),
          for (var i = 0; i < entries.length; i++)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: Colors.grey.withValues(alpha: i % 2 == 0 && i > 0 ? 0.3 : 0.12),
                    width: i % 2 == 0 && i > 0 ? 1.5 : 0.5,
                  ),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 5,
                    child: Padding(
                      padding: EdgeInsets.only(left: entries[i]["direction"] == "CR" ? 16 : 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "${entries[i]["particulars"] ?? ""}".trim(),
                            style: entries[i]["direction"] == "CR"
                                ? TextStyle(fontSize: 12.5, fontStyle: FontStyle.italic, color: soft)
                                : const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                          ),
                          if (i % 2 == 0)
                            Container(
                              margin: const EdgeInsets.only(top: 3),
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(color: muted, borderRadius: BorderRadius.circular(4)),
                              child: Text(
                                "${entries[i]["transaction_type"] ?? ""}".toUpperCase(),
                                style: TextStyle(fontSize: 9, color: soft),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Text(
                      numOf(entries[i]["debit"]) != 0 ? _amount(entries[i]["debit"]) : "",
                      textAlign: TextAlign.right,
                      style: mono,
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Text(
                      numOf(entries[i]["credit"]) != 0 ? _amount(entries[i]["credit"]) : "",
                      textAlign: TextAlign.right,
                      style: mono,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // amount without the "LKR " prefix — the table columns are narrow
  String _amount(dynamic v) => money(v).replaceFirst(RegExp(r"LKR\s"), "");

  Widget _balanceBanner(Map t, String label) {
    final ok = t["balanced"] == true;
    final color = ok ? KadeColors.success : KadeColors.amber;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(KadeRadius.md),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(ok ? Icons.check_circle : Icons.warning_amber_rounded, size: 18, color: color),
              const SizedBox(width: 6),
              Expanded(
                child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              Text(
                ok ? tr("Balanced ✓") : tr("Not balanced"),
                style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 16,
            runSpacing: 4,
            children: [
              Text("${tr("Total Debit:")} ${money(t["total_debit"])}", style: const TextStyle(fontSize: 12)),
              Text("${tr("Total Credit:")} ${money(t["total_credit"])}", style: const TextStyle(fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }

  /* ---------------------------------- Ledger tab -------------------------------- */

  // one T-account per account: what was debited and what was credited
  List<Widget> _ledgerTab() {
    final ledger = (data!["ledger"] is List) ? (data!["ledger"] as List).whereType<Map>().toList() : <Map>[];
    if (ledger.isEmpty) return [_empty(tr("No journal entries in this range."))];
    final acc = ledger.firstWhere((a) => a["account"] == ledgerAccount, orElse: () => ledger.first);
    final debits = (acc["debits"] as List? ?? []).whereType<Map>().toList();
    final credits = (acc["credits"] as List? ?? []).whereType<Map>().toList();
    return [
      // account cards size to their content (no fixed height — large fonts would overflow)
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < ledger.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                _accountChip(ledger[i], ledger[i]["account"] == acc["account"]),
              ],
            ],
          ),
        ),
      ),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: KadeColors.headerGradient),
          borderRadius: BorderRadius.circular(KadeRadius.lg),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "${acc["account"]}",
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
            ),
            Text(
              "${tr("${acc["class"]}")} · ${acc["count"]} ${tr("transactions")}",
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _heroFigure(tr("Debit"), money(acc["total_debit"])),
                const SizedBox(width: 12),
                _heroFigure(tr("Credit"), money(acc["total_credit"])),
              ],
            ),
            const Divider(color: Colors.white24, height: 20),
            Text(tr("Balance"), style: const TextStyle(color: Colors.white70, fontSize: 11)),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                _balanceText(acc),
                style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      _ledgerSide(tr("Debit (Dr)"), debits, acc["total_debit"], KadeColors.teal),
      const SizedBox(height: 12),
      _ledgerSide(tr("Credit (Cr)"), credits, acc["total_credit"], KadeColors.success),
      const SizedBox(height: 8),
      Text(
        tr("Balances cover the selected date range only. Dr = debit balance, Cr = credit balance."),
        style: Theme.of(context).textTheme.bodySmall,
      ),
    ];
  }

  String _balanceText(Map a) => a["balance_side"] == "Nil" ? tr("Nil") : "${money(a["balance"])} ${a["balance_side"]}";

  Widget _heroFigure(String label, String value) => Expanded(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    ),
  );

  Widget _accountChip(Map a, bool active) => GestureDetector(
    onTap: () => setState(() => ledgerAccount = "${a["account"]}"),
    child: Container(
      width: 180,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(KadeRadius.md),
        border: Border.all(color: active ? _primary : Colors.grey.withValues(alpha: 0.25), width: active ? 2 : 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "${a["account"]}",
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text("${tr("Dr")} ${money(a["total_debit"])}", style: const TextStyle(fontSize: 11)),
          Text("${tr("Cr")} ${money(a["total_credit"])}", style: const TextStyle(fontSize: 11)),
          Text(
            _balanceText(a),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: a["balance_side"] == "Dr"
                  ? KadeColors.teal
                  : a["balance_side"] == "Cr"
                  ? KadeColors.success
                  : Colors.grey,
            ),
          ),
        ],
      ),
    ),
  );

  Widget _ledgerSide(String title, List<Map> entries, dynamic total, Color tone) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: TextStyle(color: tone, fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: 0.5),
          ),
          const SizedBox(height: 6),
          if (entries.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Text(tr("No entries"), style: const TextStyle(color: Colors.grey)),
            ),
          for (final e in entries)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text("${e["particulars"]}", style: const TextStyle(fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(width: 8),
                      Text(money(e["amount"]), style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                  // date · code · type · note get the full width
                  Text(
                    [
                      _ymd(DateTime.tryParse("${e["date"]}")?.toLocal() ?? DateTime.now()),
                      if (e["code"] != null) "${e["code"]}",
                      "${e["transaction_type"]}",
                      if ("${e["note"] ?? ""}".isNotEmpty) "${e["note"]}",
                    ].join(" · "),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          const Divider(height: 18),
          Row(
            children: [
              Expanded(
                child: Text(tr("Total"), style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
              Text(money(total), style: const TextStyle(fontWeight: FontWeight.w800)),
            ],
          ),
        ],
      ),
    ),
  );

  /* ---------------------------------- Goods tab --------------------------------- */

  List<Widget> _goodsTab() {
    final goods = data!["goods"] is Map ? data!["goods"] as Map : const {};
    final items = goods["items"] is List ? (goods["items"] as List).whereType<Map>().toList() : <Map>[];
    if (items.isEmpty) return [_empty(tr("No goods movement in this range."))];
    final soft = Theme.of(context).textTheme.bodySmall?.color;
    return [
      Row(
        children: [
          Expanded(
            child: _statBox(tr("Total Sold"), "${qtyOf(goods["total_sold_qty"])} ${tr("units")}", KadeColors.terra),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _statBox(
              tr("Total Bought"),
              "${qtyOf(goods["total_bought_qty"])} ${tr("units")}",
              KadeColors.success,
            ),
          ),
        ],
      ),
      const SizedBox(height: 12),
      Card(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            Container(
              color: Theme.of(context).brightness == Brightness.dark
                  ? KadeColors.surfaceMutedDark
                  : KadeColors.surfaceMutedLight,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  Expanded(flex: 4, child: _th(tr("Item"))),
                  Expanded(flex: 2, child: _th(tr("Sold"), right: true)),
                  Expanded(flex: 2, child: _th(tr("Bought"), right: true)),
                  Expanded(flex: 3, child: _th(tr("Net change"), right: true)),
                ],
              ),
            ),
            for (final g in items)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: Colors.grey.withValues(alpha: 0.15))),
                ),
                child: Row(
                  children: [
                    Expanded(
                      flex: 4,
                      child: Text("${g["item"] ?? "—"}", style: const TextStyle(fontWeight: FontWeight.w600)),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        numOf(g["sold_qty"]) == 0 ? "—" : qtyOf(g["sold_qty"]),
                        textAlign: TextAlign.right,
                        style: const TextStyle(color: KadeColors.terra),
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Text(
                        numOf(g["bought_qty"]) == 0 ? "—" : qtyOf(g["bought_qty"]),
                        textAlign: TextAlign.right,
                        style: const TextStyle(color: KadeColors.success),
                      ),
                    ),
                    Expanded(flex: 3, child: _netCell(numOf(g["net_qty"]))),
                  ],
                ),
              ),
          ],
        ),
      ),
      const SizedBox(height: 8),
      Text(
        tr("▲ stock increased (bought more than sold) · ▼ stock decreased (sold more than bought)"),
        style: TextStyle(fontSize: 11, color: soft),
      ),
    ];
  }

  Widget _th(String text, {bool right = false}) => Text(
    text,
    textAlign: right ? TextAlign.right : TextAlign.left,
    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
  );

  Widget _netCell(double n) => Text(
    "${n > 0
        ? "▲ "
        : n < 0
        ? "▼ "
        : ""}${qtyOf(n.abs())}",
    textAlign: TextAlign.right,
    style: TextStyle(
      fontWeight: FontWeight.w700,
      color: n > 0
          ? KadeColors.success
          : n < 0
          ? KadeColors.terra
          : Colors.grey,
    ),
  );

  Widget _statBox(String label, String value, Color color) => Card(
    margin: EdgeInsets.zero,
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: color),
            ),
          ),
        ],
      ),
    ),
  );

  /* ------------------------------ Profit & Loss tab ----------------------------- */

  List<Widget> _pnlTab() {
    if (data!["profit_loss"] is! Map) return [_empty(tr("No data for profit / loss."))];
    final p = data!["profit_loss"] as Map;
    final expenses = p["expenses"] is List ? (p["expenses"] as List).whereType<Map>().toList() : <Map>[];
    final profit = p["is_profit"] == true;
    final gp = numOf(p["gross_profit"]);
    final resultColor = profit ? KadeColors.success : KadeColors.terra;

    return [
      _account(tr("Trading Account"), [
        _pnlRow(tr("Sales A/C"), p["sales"]),
        _pnlRow(tr("Less: Cost of Goods Sold"), p["cost_of_goods"], indent: true),
        _pnlRow(
          tr("Gross Profit"),
          gp,
          bold: true,
          border: true,
          color: gp >= 0 ? KadeColors.success : KadeColors.terra,
        ),
      ]),
      const SizedBox(height: 12),
      _account(tr("Profit & Loss Account"), [
        _pnlRow(tr("Gross Profit b/d"), gp),
        if (expenses.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Text(tr("No expenses recorded."), style: Theme.of(context).textTheme.bodySmall),
          )
        else ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
            child: Text(
              tr("Less: Expenses").toUpperCase(),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Theme.of(context).textTheme.bodySmall?.color,
              ),
            ),
          ),
          for (final e in expenses) _pnlRow(tr("${e["account"] ?? "—"}"), e["amount"], indent: true),
          _pnlRow(tr("Total Expenses"), p["total_expenses"], border: true),
        ],
        _pnlRow(
          profit ? tr("Net Profit") : tr("Net Loss"),
          numOf(p["net_profit"]).abs(),
          bold: true,
          border: true,
          color: resultColor,
        ),
      ]),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: resultColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(KadeRadius.md),
          border: Border.all(color: resultColor.withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            Icon(profit ? Icons.trending_up : Icons.trending_down, color: resultColor),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                "${profit ? tr("Net Profit") : tr("Net Loss")}: ${money(numOf(p["net_profit"]).abs())}",
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    ];
  }

  Widget _account(String title, List<Widget> rows) => Card(
    margin: EdgeInsets.zero,
    clipBehavior: Clip.antiAlias,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          color: Theme.of(context).brightness == Brightness.dark
              ? KadeColors.surfaceMutedDark
              : KadeColors.surfaceMutedLight,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        ),
        ...rows,
      ],
    ),
  );

  Widget _pnlRow(
    String label,
    dynamic value, {
    bool indent = false,
    bool bold = false,
    bool border = false,
    Color? color,
  }) => Container(
    padding: EdgeInsets.fromLTRB(indent ? 28 : 14, 10, 14, 10),
    decoration: border
        ? BoxDecoration(
            border: Border(top: BorderSide(color: Colors.grey.withValues(alpha: 0.3))),
          )
        : null,
    child: Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontWeight: bold ? FontWeight.w700 : FontWeight.normal,
              color: indent ? Theme.of(context).textTheme.bodySmall?.color : null,
            ),
          ),
        ),
        Text(
          money(value),
          style: TextStyle(
            fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
            color: color,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    ),
  );

  Widget _empty(String text) => Container(
    margin: const EdgeInsets.only(top: 8),
    padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 20),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(KadeRadius.lg),
      border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
    ),
    child: Text(
      text,
      textAlign: TextAlign.center,
      style: const TextStyle(color: Colors.grey),
    ),
  );
}
