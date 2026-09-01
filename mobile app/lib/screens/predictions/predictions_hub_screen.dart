import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/insights_service.dart';
import '../predictions/prediction_widgets.dart';

class PredictionsHubScreen extends StatefulWidget {
  const PredictionsHubScreen({super.key});
  @override
  State<PredictionsHubScreen> createState() => _PredictionsHubScreenState();
}

class _PredictionsHubScreenState extends State<PredictionsHubScreen> {
  Map<String, dynamic> data = {};
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      data = await InsightsService.get();
    } catch (_) {
      data = {};
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sub = Theme.of(context).textTheme.bodySmall?.color;
    final credit = (data["credit"] ?? {}) as Map;
    final demand = (data["demand"] ?? {}) as Map;
    final procurement = (data["procurement"] ?? {}) as Map;
    final anomaly = (data["anomaly"] ?? {}) as Map;

    return Scaffold(
      appBar: AppBar(title: const Text("Your Forecasts")),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    "Simple predictions based on your recent activity. "
                    "Green means something is helping you; red means it's holding you back.",
                    style: TextStyle(color: sub, height: 1.4),
                  ),
                  const SizedBox(height: 16),
                  _creditCard(credit, isDark),
                  const SizedBox(height: 12),
                  _demandCard(demand, isDark),
                  const SizedBox(height: 12),
                  _procurementCard(procurement, isDark),
                  const SizedBox(height: 12),
                  _anomalyCard(anomaly, isDark),
                ],
              ),
            ),
    );
  }

  Widget _shell({
    required String tag,
    required String title,
    required String icon,
    required Color tint,
    required bool isDark,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? KadeColors.borderDark : KadeColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(tag, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: tint)),
              Text(title,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
            ]),
            const Spacer(),
            Text(icon, style: const TextStyle(fontSize: 26)),
          ]),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _unavailable(Map m) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Text("${m["reason"] ?? "Not enough data yet to show this."}",
            style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color)),
      );

  Widget _pill(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.15),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(text, style: TextStyle(fontWeight: FontWeight.w800, color: color)),
      );

  /* ------------------------------ Loan readiness ------------------------------ */

  Widget _creditCard(Map m, bool isDark) {
    if (m["available"] != true) {
      return _shell(
          tag: "MONEY", title: "Loan Readiness", icon: "💳",
          tint: KadeColors.teal, isDark: isDark, child: _unavailable(m));
    }
    // API returns credit_score + status (not score / prediction)
    final score = (m["credit_score"] is num)
        ? (m["credit_score"] as num).toDouble()
        : ((m["score"] is num) ? (m["score"] as num).toDouble() : 0.0);
    final ready = "${m["status"] ?? ""}".startsWith("APPROVED");
    final maxLoan = (m["max_loan_limit_lkr"] is num) ? (m["max_loan_limit_lkr"] as num) : 0;
    final features = (m["features"] is Map) ? m["features"] as Map : null;
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    return _shell(
      tag: "MONEY", title: "Loan Readiness", icon: "💳",
      tint: KadeColors.teal, isDark: isDark,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          RingGauge(score: score),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _pill(ready ? "Ready to apply" : "Not ready yet",
                  ready ? KadeColors.teal : KadeColors.amber),
              if (ready && maxLoan > 0) ...[
                const SizedBox(height: 6),
                Text("Eligible up to LKR ${maxLoan.toStringAsFixed(0)}",
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w700, color: KadeColors.teal)),
              ],
              if (features != null) ...[
                const SizedBox(height: 8),
                Text(
                  "In business: ${features["months_active"]} mo\n"
                  "Daily sales: ${features["avg_daily_txns"]}  ·  "
                  "Margin: ${features["profit_margin_pct"]}%",
                  style: TextStyle(fontSize: 12, color: sub, height: 1.4),
                ),
              ],
            ]),
          ),
        ]),
        InfluenceBars(explanation: (m["explanation"] is List) ? m["explanation"] as List : const []),
      ]),
    );
  }

  /* ------------------------------ Sales forecast ------------------------------ */

  Widget _demandCard(Map m, bool isDark) {
    if (m["available"] != true) {
      return _shell(
          tag: "INVENTORY", title: "Sales Forecast", icon: "📈",
          tint: KadeColors.amber, isDark: isDark, child: _unavailable(m));
    }
    final items = (m["items"] is List) ? m["items"] as List : const [];
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    return _shell(
      tag: "INVENTORY", title: "Sales Forecast", icon: "📈",
      tint: KadeColors.amber, isDark: isDark,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ...items.map((raw) {
          final it = raw as Map;
          final f = it["forecast_units"];
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: KadeColors.amber.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text("${it["item"]}",
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  Text("Stock: ${it["quantity"]} · Reorder: ${it["reorder_level"]}",
                      style: TextStyle(fontSize: 11, color: sub)),
                ]),
              ),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text("≈ ${f is num ? f.toStringAsFixed(0) : "—"}",
                    style: const TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w800,
                        fontFamily: "Nunito", color: KadeColors.amber)),
                Text("units / next wk", style: TextStyle(fontSize: 10, color: sub)),
              ]),
            ]),
          );
        }),
      ]),
    );
  }

  /* -------------------------------- Buy or wait ------------------------------- */

  Widget _procurementCard(Map m, bool isDark) {
    if (m["available"] != true) {
      return _shell(
          tag: "PURCHASING", title: "Buy or Wait", icon: "🛒",
          tint: KadeColors.terra, isDark: isDark, child: _unavailable(m));
    }
    final items = (m["items"] is List) ? m["items"] as List : const [];
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    return _shell(
      tag: "PURCHASING", title: "Buy or Wait", icon: "🛒",
      tint: KadeColors.terra, isDark: isDark,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ...items.map((raw) {
          final it = raw as Map;
          final buy = it["action"] == "BUY";
          final ctx = "${it["price_context"] ?? ""}";
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text("${it["item"]}",
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    Text("Stock: ${it["quantity"]} · Reorder: ${it["reorder_level"]}",
                        style: TextStyle(fontSize: 11, color: sub)),
                  ]),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: (buy ? KadeColors.teal : Colors.grey).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(buy ? "🛒 Buy" : "⏳ Wait",
                      style: TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w800,
                          fontFamily: "Nunito", color: buy ? KadeColors.teal : Colors.grey)),
                ),
              ]),
              if (ctx.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text("${buy ? "Stock low — restock needed. " : "Enough stock. "}$ctx",
                    style: TextStyle(fontSize: 11, color: sub, fontStyle: FontStyle.italic)),
              ],
            ]),
          );
        }),
      ]),
    );
  }

  /* ----------------------------- Account activity ----------------------------- */

  Widget _anomalyCard(Map m, bool isDark) {
    if (m["available"] != true) {
      return _shell(
          tag: "SECURITY", title: "Account Activity", icon: "🛡️",
          tint: Colors.blue, isDark: isDark, child: _unavailable(m));
    }
    final flagged = m["prediction"] == 1;
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    return _shell(
      tag: "SECURITY", title: "Account Activity", icon: "🛡️",
      tint: Colors.blue, isDark: isDark,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text("Most recent: ${m["customer"]} · LKR ${m["amount"]}",
            style: TextStyle(fontSize: 12, color: sub)),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: (flagged ? KadeColors.terra : KadeColors.teal).withOpacity(0.15),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(flagged ? "⚠ Looks unusual" : "✓ Looks normal",
              style: TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w800, fontFamily: "Nunito",
                  color: flagged ? KadeColors.terra : KadeColors.teal)),
        ),
        if (flagged) ...[
          const SizedBox(height: 8),
          Text("This looks different from your usual pattern — worth a quick check.",
              style: TextStyle(fontSize: 12, color: KadeColors.terra)),
        ],
        InfluenceBars(explanation: (m["explanation"] is List) ? m["explanation"] as List : const []),
      ]),
    );
  }
}