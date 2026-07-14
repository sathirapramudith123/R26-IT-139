import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/insights_service.dart';

class PredictionsHubScreen extends StatefulWidget {
  const PredictionsHubScreen({super.key});
  @override
  State<PredictionsHubScreen> createState() => _PredictionsHubScreenState();
}

class _PredictionsHubScreenState extends State<PredictionsHubScreen> {
  Map<String, dynamic> data = {};
  bool loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => loading = true);
    try { data = await InsightsService.get(); }
    catch (_) { data = {}; }
    finally { if (mounted) setState(() => loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final credit      = (data["credit"] ?? {}) as Map;
    final demand      = (data["demand"] ?? {}) as Map;
    final procurement = (data["procurement"] ?? {}) as Map;
    final anomaly     = (data["anomaly"] ?? {}) as Map;

    return Scaffold(
      appBar: AppBar(title: const Text("Smart Predictions")),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text("Four explainable models, running on your own data.",
                      style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color)),
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

  Widget _shell({required String tag, required String title, required String icon,
      required Color tint, required bool isDark, required Widget child}) {
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
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
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
        child: Text("${m["reason"] ?? "Not available."}",
            style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color)),
      );

  Widget _shap(Map m) {
    final exp = m["explanation"];
    if (exp is! List || exp.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Why this result?",
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                  color: Theme.of(context).textTheme.bodySmall?.color)),
          const SizedBox(height: 6),
          ...exp.take(3).map((f) {
            final impact = (f["impact"] is num) ? (f["impact"] as num).toDouble() : 0.0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(children: [
                Container(height: 6, width: 6,
                    decoration: BoxDecoration(
                        color: impact > 0 ? KadeColors.teal : KadeColors.terra,
                        shape: BoxShape.circle)),
                const SizedBox(width: 8),
                Expanded(child: Text("${f["feature"]}".replaceAll("_", " "),
                    style: const TextStyle(fontSize: 12))),
                Text("${impact > 0 ? "+" : ""}${impact.toStringAsFixed(2)}",
                    style: TextStyle(fontSize: 11,
                        color: Theme.of(context).textTheme.bodySmall?.color)),
              ]),
            );
          }),
        ],
      ),
    );
  }

  Widget _creditCard(Map m, bool isDark) {
    if (m["available"] != true) {
      return _shell(tag: "C1", title: "Credit Readiness", icon: "💳",
          tint: KadeColors.teal, isDark: isDark, child: _unavailable(m));
    }
    final score = (m["score"] is num) ? (m["score"] as num).toDouble() : 0.0;
    final ready = m["prediction"] == 1;
    final color = score >= 70 ? KadeColors.teal : (score >= 40 ? KadeColors.amber : KadeColors.terra);

    return _shell(tag: "C1", title: "Credit Readiness", icon: "💳",
      tint: KadeColors.teal, isDark: isDark,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(score.toStringAsFixed(0),
              style: TextStyle(fontSize: 40, fontWeight: FontWeight.w800,
                  fontFamily: "Nunito", color: color)),
          const Text(" / 100", style: TextStyle(fontSize: 14, color: Colors.grey)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: (ready ? KadeColors.teal : KadeColors.amber).withOpacity(0.15),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(ready ? "Credit-ready" : "Not yet",
                style: TextStyle(fontWeight: FontWeight.w800,
                    color: ready ? KadeColors.teal : KadeColors.amber)),
          ),
        ]),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: (score / 100).clamp(0.0, 1.0),
            minHeight: 8, color: color,
            backgroundColor: isDark ? Colors.white10 : const Color(0xFFECE3D5),
          ),
        ),
        _shap(m),
      ]),
    );
  }

  Widget _demandCard(Map m, bool isDark) {
    if (m["available"] != true) {
      return _shell(tag: "C2", title: "Demand Forecast", icon: "📈",
          tint: KadeColors.amber, isDark: isDark, child: _unavailable(m));
    }
    final pred = (m["prediction"] is num) ? (m["prediction"] as num).toDouble() : 0.0;

    return _shell(tag: "C2", title: "Demand Forecast", icon: "📈",
      tint: KadeColors.amber, isDark: isDark,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text("Next week for ${m["item"]}",
            style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color)),
        const SizedBox(height: 6),
        Row(crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(pred.toStringAsFixed(0),
                style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800,
                    fontFamily: "Nunito", color: KadeColors.amber)),
            const SizedBox(width: 6),
            const Text("units", style: TextStyle(fontSize: 14, color: Colors.grey)),
          ]),
        _shap(m),
      ]),
    );
  }

  Widget _procurementCard(Map m, bool isDark) {
    if (m["available"] != true) {
      return _shell(tag: "C3", title: "Buy Now or Wait", icon: "🛒",
          tint: KadeColors.terra, isDark: isDark, child: _unavailable(m));
    }
    final buy = m["prediction"] == 1;
    final score = (m["score"] is num) ? (m["score"] as num).toDouble() : null;

    return _shell(tag: "C3", title: "Buy Now or Wait", icon: "🛒",
      tint: KadeColors.terra, isDark: isDark,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text("For ${m["item"]}",
            style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color)),
        const SizedBox(height: 10),
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: (buy ? KadeColors.teal : Colors.grey).withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(buy ? "Buy now" : "Wait",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800,
                    fontFamily: "Nunito", color: buy ? KadeColors.teal : Colors.grey)),
          ),
          if (score != null) ...[
            const SizedBox(width: 12),
            Text("${score.toStringAsFixed(0)}% confidence",
                style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color)),
          ],
        ]),
        _shap(m),
      ]),
    );
  }

  Widget _anomalyCard(Map m, bool isDark) {
    if (m["available"] != true) {
      return _shell(tag: "C4", title: "Banking Anomaly", icon: "🛡️",
          tint: Colors.blue, isDark: isDark, child: _unavailable(m));
    }
    final flagged = m["prediction"] == 1;
    final score = (m["score"] is num) ? (m["score"] as num).toDouble() : null;

    return _shell(tag: "C4", title: "Banking Anomaly", icon: "🛡️",
      tint: Colors.blue, isDark: isDark,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text("Latest: ${m["customer"]} · LKR ${m["amount"]}",
            style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color)),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: (flagged ? KadeColors.terra : KadeColors.teal).withOpacity(0.15),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(flagged ? "⚠ Looks unusual" : "✓ Looks normal",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800,
                  fontFamily: "Nunito", color: flagged ? KadeColors.terra : KadeColors.teal)),
        ),
        if (score != null) ...[
          const SizedBox(height: 8),
          Text("Anomaly score: ${score.toStringAsFixed(1)}/100",
              style: TextStyle(fontSize: 12, color: Theme.of(context).textTheme.bodySmall?.color)),
        ],
        _shap(m),
      ]),
    );
  }
}