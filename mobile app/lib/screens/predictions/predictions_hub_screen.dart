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
    final score = (m["score"] is num) ? (m["score"] as num).toDouble() : 0.0;
    final ready = m["prediction"] == 1;
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
    final pred = (m["prediction"] is num) ? (m["prediction"] as num).toDouble() : 0.0;
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    // Trend line only appears if the API sends a history array:
    //   demand.history = [{ "label": "3 wks ago", "units": 40 }, ...]
    final history = m["history"];
    List<double> vals = [];
    List<String> labs = [];
    if (history is List && history.isNotEmpty) {
      for (final h in history) {
        if (h is Map) {
          vals.add((h["units"] is num) ? (h["units"] as num).toDouble() : 0.0);
          labs.add("${h["label"] ?? ""}");
        }
      }
      vals.add(pred);
      labs.add("Next wk");
    }

    return _shell(
      tag: "INVENTORY", title: "Sales Forecast", icon: "📈",
      tint: KadeColors.amber, isDark: isDark,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text("Product: ${m["item"]}", style: TextStyle(fontSize: 12, color: sub)),
        if (vals.length >= 2) ...[
          const SizedBox(height: 10),
          MiniTrendChart(values: vals, labels: labs, color: KadeColors.amber),
        ],
        const SizedBox(height: 8),
        Row(crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic, children: [
          Text("≈ ${pred.toStringAsFixed(0)}",
              style: const TextStyle(
                  fontSize: 40, fontWeight: FontWeight.w800, fontFamily: "Nunito", color: KadeColors.amber)),
          const SizedBox(width: 8),
          const Expanded(
            child: Text("units expected to sell next week",
                style: TextStyle(fontSize: 13, color: Colors.grey)),
          ),
        ]),
        InfluenceBars(explanation: (m["explanation"] is List) ? m["explanation"] as List : const []),
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
    final buy = m["prediction"] == 1;
    final score = (m["score"] is num) ? (m["score"] as num).toDouble() : null;
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    return _shell(
      tag: "PURCHASING", title: "Buy or Wait", icon: "🛒",
      tint: KadeColors.terra, isDark: isDark,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text("Product: ${m["item"]}", style: TextStyle(fontSize: 12, color: sub)),
        const SizedBox(height: 10),
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: (buy ? KadeColors.teal : Colors.grey).withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(buy ? "Buy now" : "Wait",
                style: TextStyle(
                    fontSize: 18, fontWeight: FontWeight.w800, fontFamily: "Nunito",
                    color: buy ? KadeColors.teal : Colors.grey)),
          ),
          if (score != null) ...[
            const SizedBox(width: 12),
            Expanded(
              child: Text("We're ${score.toStringAsFixed(0)}% sure",
                  style: TextStyle(fontSize: 12, color: sub)),
            ),
          ],
        ]),
        const SizedBox(height: 8),
        Text(
          buy
              ? "Prices look good right now — a fair moment to restock."
              : "Prices may improve soon — holding off could save you money.",
          style: TextStyle(fontSize: 12, color: sub),
        ),
        InfluenceBars(explanation: (m["explanation"] is List) ? m["explanation"] as List : const []),
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