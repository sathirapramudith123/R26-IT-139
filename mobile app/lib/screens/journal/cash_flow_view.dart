import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/i18n.dart';
import '../common/record_details.dart' show money, numOf;

/// Journal → Cash (same as the web tab): the shop's Cash A/C — cash flow and balance — and, kept
/// apart, the agency-banking cash: customers' deposits and withdrawals, float top-ups, today's cash
/// on hand and each partner bank's float. Data: GET /reports/cash-flow.
class CashFlowView extends StatefulWidget {
  final String from;
  final String to;
  const CashFlowView({super.key, required this.from, required this.to});

  @override
  State<CashFlowView> createState() => _CashFlowViewState();
}

const _event = {
  "DEPOSIT": "Customer deposit",
  "WITHDRAWAL": "Customer withdrawal",
  "TOPUP": "Float top-up",
  "WITHDRAWAL_REVERSAL": "Withdrawal reversed",
  "DEPOSIT_REVERSAL": "Deposit reversed",
};
const _health = {
  "HEALTHY": "Healthy",
  "BELOW_FLOOR": "Below floor · top up",
  "LOW_ALERT": "Low",
  "CRITICAL_ALERT": "Critical",
};

class _CashFlowViewState extends State<CashFlowView> {
  Map<String, dynamic>? data;
  String? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final d = await Api.get("/reports/cash-flow?from=${widget.from}&to=${widget.to}");
      if (mounted) setState(() => data = d is Map ? Map<String, dynamic>.from(d) : null);
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Map<String, dynamic> _map(dynamic v) => v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};
  List<Map<String, dynamic>> _list(dynamic v) =>
      v is List ? v.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList() : [];

  String _when(dynamic v) {
    final d = DateTime.tryParse("${v ?? ""}")?.toLocal();
    if (d == null) return "";
    return "${d.day.toString().padLeft(2, "0")}/${d.month.toString().padLeft(2, "0")} "
        "${d.hour.toString().padLeft(2, "0")}:${d.minute.toString().padLeft(2, "0")}";
  }

  Widget _card(String label, num value, {Color? color, String? sub}) {
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(KadeRadius.md),
        boxShadow: const [BoxShadow(color: KadeColors.cardShadow, blurRadius: 6)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: text.labelSmall, maxLines: 2),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(money(value), style: text.titleMedium?.copyWith(color: color)),
          ),
          if (sub != null) Text(sub, style: text.bodySmall, maxLines: 2),
        ],
      ),
    );
  }

  Widget _grid(List<Widget> cards) => GridView.count(
    crossAxisCount: 2,
    shrinkWrap: true,
    physics: const NeverScrollableScrollPhysics(),
    mainAxisSpacing: 10,
    crossAxisSpacing: 10,
    childAspectRatio: 1.7,
    children: cards,
  );

  Widget _row(String label, num value, {int sign = 0, bool bold = false}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(
      children: [
        Expanded(
          child: Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w700 : null)),
        ),
        Text(
          "${sign > 0
              ? "+"
              : sign < 0
              ? "−"
              : ""}${money(value)}",
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: sign > 0
                ? KadeColors.success
                : sign < 0
                ? KadeColors.terra
                : null,
          ),
        ),
      ],
    ),
  );

  Widget _box(String title, List<Widget> children) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    ),
  );

  Widget _entries(
    List<Map<String, dynamic>> rows,
    String Function(Map<String, dynamic>) label, {
    bool balance = false,
  }) {
    if (rows.isEmpty) {
      return Text(tr("No entries in this range."), style: Theme.of(context).textTheme.bodySmall);
    }
    final shown = rows.reversed.take(30).toList(); // newest first
    return Column(
      children: [
        for (final r in shown)
          ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            title: Text(label(r), maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text(_when(r["date"])),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  "${numOf(r["amount"]) >= 0 ? "+" : "−"}${money(numOf(r["amount"]).abs())}",
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: numOf(r["amount"]) >= 0 ? KadeColors.success : KadeColors.terra,
                  ),
                ),
                if (balance) Text(money(numOf(r["balance"])), style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Padding(
        padding: EdgeInsets.only(top: 60),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (data == null) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Text(error ?? tr("No data for this range."), style: const TextStyle(color: KadeColors.terra)),
      );
    }
    final shop = _map(data!["shop"]);
    final agency = _map(data!["agency"]);
    final p = _map(agency["period"]);
    final today = _map(agency["today"]);
    final closing = numOf(shop["closing"]);
    final text = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ===== shop cash =====
        Text(tr("Shop cash — Cash A/C"), style: text.titleMedium),
        const SizedBox(height: 8),
        _grid([
          _card(tr("Opening balance"), numOf(shop["opening"]), sub: "${tr("before")} ${data!["from"]}"),
          _card(tr("Cash in"), numOf(shop["total_in"]), color: KadeColors.success),
          _card(tr("Cash out"), numOf(shop["total_out"]), color: KadeColors.terra),
          _card(
            tr("Cash A/C balance"),
            closing,
            color: closing >= 0 ? KadeColors.success : KadeColors.terra,
            sub: "${tr("as at")} ${data!["to"]}",
          ),
        ]),
        const SizedBox(height: 10),
        _box(tr("Cash in"), [
          for (final e in _map(shop["cash_in"]).entries) _row(tr(e.key), numOf(e.value), sign: 1),
          if (_map(shop["cash_in"]).isEmpty) Text(tr("None in this range."), style: text.bodySmall),
        ]),
        _box(tr("Cash out"), [
          for (final e in _map(shop["cash_out"]).entries) _row(tr(e.key), numOf(e.value), sign: -1),
          if (_map(shop["cash_out"]).isEmpty) Text(tr("None in this range."), style: text.bodySmall),
        ]),
        _box(tr("Cash A/C"), [
          _entries(
            _list(shop["entries"]),
            (r) => "${tr("${r["kind"]}")} · ${r["note"] ?? ""}",
            balance: true,
          ),
        ]),

        const SizedBox(height: 18),
        // ===== agency banking cash (separate) =====
        Text(tr("Agency banking cash"), style: text.titleMedium),
        Text(
          tr("Customers' money, kept separate from the shop's cash — not income or expenses of the shop."),
          style: text.bodySmall,
        ),
        const SizedBox(height: 8),
        _grid([
          _card(
            tr("Cash on hand (now)"),
            numOf(today["cash_on_hand"]),
            sub: "${tr("Day started with")} ${money(numOf(today["day_start_cash"]))}",
          ),
          _card(
            tr("Available for withdrawals"),
            numOf(today["available_for_withdrawals"]),
            color: KadeColors.success,
          ),
          _card(
            tr("Available for float top-up"),
            numOf(today["available_for_topup"]),
            sub: "${tr("Reserve kept")} ${money(numOf(today["reserve_floor"]))}",
          ),
          _card(tr("Total float (all banks)"), numOf(agency["total_float"])),
        ]),
        const SizedBox(height: 10),
        _box(tr("Cash flow in this range"), [
          _row(tr("Customer deposits received"), numOf(p["deposits"]), sign: 1),
          _row(tr("Customer withdrawals paid out"), numOf(p["withdrawals"]), sign: -1),
          _row(tr("Cash used for float top-ups"), numOf(p["float_topups"]), sign: -1),
          _row(tr("Withdrawals reversed"), numOf(p["reversals_in"]), sign: 1),
          _row(tr("Deposits reversed"), numOf(p["reversals_out"]), sign: -1),
          const Divider(),
          _row(tr("Net cash change"), numOf(p["net"]), bold: true),
        ]),
        _box(tr("Float per partner bank"), [
          if (_list(agency["banks"]).isEmpty) Text(tr("No partner banks yet."), style: text.bodySmall),
          for (final b in _list(agency["banks"]))
            ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text("${b["bank_name"]} · ${tr(_health["${b["health"]}"] ?? "${b["health"]}")}"),
              subtitle: Text(
                "${tr("Floor")} ${money(numOf(b["float_floor"]))} · ${tr("Ceiling")} ${money(numOf(b["float_ceiling"]))}",
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(money(numOf(b["float_balance"])), style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(
                    "${tr("available for deposits")}: ${money(numOf(b["available_for_deposits"]))}",
                    style: text.bodySmall,
                  ),
                ],
              ),
            ),
        ]),
        _box(tr("Agency banking cash"), [
          _entries(
            _list(p["entries"]),
            (r) =>
                "${tr(_event["${r["event"]}"] ?? "${r["event"]}")}${"${r["customer"] ?? ""}".isEmpty ? "" : " · ${r["customer"]}"}",
          ),
        ]),
      ],
    );
  }
}
