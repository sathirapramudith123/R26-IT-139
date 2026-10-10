import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/insights_service.dart';
import 'prediction_widgets.dart';
import 'prediction_extras.dart';
import '../../core/i18n.dart';
import '../common/record_details.dart' show money;

// two decimals, like every other amount in the app
String _lkr(num v) => money(v);

class PredictionsHubScreen extends StatefulWidget {
  const PredictionsHubScreen({super.key});
  @override
  State<PredictionsHubScreen> createState() => _PredictionsHubScreenState();
}

class _PredictionsHubScreenState extends State<PredictionsHubScreen> {
  Map<String, dynamic> data = {};
  bool loading = true;
  int? openItem = 0; // forecast row whose chart is open

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
    final credit = (data["credit"] ?? {}) as Map;
    final demand = (data["demand"] ?? {}) as Map;
    final procurement = (data["procurement"] ?? {}) as Map;
    final anomaly = (data["anomaly"] ?? {}) as Map;
    final score = (credit["credit_score"] as num?)?.toDouble() ?? 0;

    return Scaffold(
      appBar: AppBar(title: Text(tr("Your Forecasts"))),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                children: [
                  _hero(credit, demand, procurement, anomaly, score),
                  const SizedBox(height: 14),
                  _creditCard(credit, score),
                  if (credit["available"] == true) ...[
                    const SizedBox(height: 12),
                    WhatIfCard(
                      features: (credit["features"] as Map?) ?? {},
                      baseScore: score,
                      baseStatus: "${credit["status"] ?? ""}",
                      baseLimit: (credit["max_loan_limit_lkr"] as num?) ?? 0,
                    ),
                    const SizedBox(height: 12),
                    ActionPlanCard(explanation: (credit["explanation"] as List?) ?? const []),
                  ],
                  const SizedBox(height: 12),
                  _demandCard(demand),
                  const SizedBox(height: 12),
                  _procurementCard(procurement),
                  const SizedBox(height: 12),
                  _anomalyCard(anomaly),
                  const SizedBox(height: 12),
                  const ModelTrustPanel(),
                ],
              ),
            ),
    );
  }

  /* ------------------------------ Business health ------------------------------ */

  Widget _hero(Map credit, Map demand, Map procurement, Map anomaly, double score) {
    final items = (demand["items"] as List?) ?? const [];
    final units = items.fold<double>(0, (s, it) => s + (((it as Map)["forecast_units"] as num?) ?? 0));
    final toBuy = ((procurement["items"] as List?) ?? const [])
        .where((it) => (it as Map)["action"] == "BUY")
        .length;
    final ready = "${credit["status"] ?? ""}".startsWith("APPROVED");
    final unusual = anomaly["prediction"] == 1;

    Widget tile(String label, String value, String sub, bool good) => Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ),
          if (sub.isNotEmpty)
            Text(
              sub,
              style: TextStyle(color: good ? const Color(0xFFB9F5D8) : const Color(0xFFFFE08A), fontSize: 11),
            ),
        ],
      ),
    );

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: KadeColors.headerGradient,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (credit["available"] == true)
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                  child: RingGauge(score: score, size: 76),
                ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tr("AI insights"), style: const TextStyle(color: Colors.white70, fontSize: 12)),
                    Text(
                      tr("Your Business Forecasts"),
                      style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      tr(
                        "Four AI models read your records. Every result shows why — and what you can do about it.",
                      ),
                      style: const TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // two rows that grow with their text (a fixed-ratio grid overflowed with 3 lines / Sinhala)
          for (final pair in [
            [
              tile(
                tr("Credit Score"),
                credit["available"] == true ? "${score.toStringAsFixed(0)}/100" : "—",
                ready ? tr("✅ Ready") : tr("⚠️ Needs work"),
                ready,
              ),
              tile(
                tr("Sales next week"),
                demand["available"] == true ? "${units.toStringAsFixed(0)} ${tr("units")}" : tr("N/A"),
                "",
                true,
              ),
            ],
            [
              tile(
                tr("To restock"),
                procurement["available"] == true ? "$toBuy ${tr("items")}" : "—",
                toBuy > 0 ? tr("🛒 Buy") : tr("✓ Adequate"),
                toBuy == 0,
              ),
              tile(
                tr("Account safety"),
                anomaly["available"] == true ? (unusual ? tr("🚨 Check needed") : tr("🛡️ All clear")) : "—",
                "",
                !unusual,
              ),
            ],
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(child: pair[0]),
                    const SizedBox(width: 8),
                    Expanded(child: pair[1]),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  /* ------------------------------ shared card shell ------------------------------ */

  Widget _shell({
    required String tag,
    required String title,
    required String icon,
    required Color tint,
    required Widget child,
    required String model,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tr(tag).toUpperCase(),
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: tint),
                    ),
                    Text(tr(title), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ],
                ),
                const Spacer(),
                Text(icon, style: const TextStyle(fontSize: 26)),
              ],
            ),
            const SizedBox(height: 14),
            child,
            TrustLine(model: model),
          ],
        ),
      ),
    );
  }

  Widget _unavailable(Map m) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 14),
    child: Text(
      tr("${m["reason"] ?? "Not enough data yet to show this."}"),
      style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color),
    ),
  );

  Widget _pill(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(999)),
    child: Text(
      text,
      style: TextStyle(fontWeight: FontWeight.w700, color: color),
    ),
  );

  /* ------------------------------ Credit score ------------------------------ */

  Widget _creditCard(Map m, double score) {
    const tag = "Money", title = "Credit Score";
    if (m["available"] != true) {
      return _shell(
        tag: tag,
        title: title,
        icon: "💳",
        tint: KadeColors.teal,
        model: "credit",
        child: _unavailable(m),
      );
    }
    final ready = "${m["status"] ?? ""}".startsWith("APPROVED");
    final maxLoan = (m["max_loan_limit_lkr"] as num?) ?? 0;
    final features = (m["features"] is Map) ? m["features"] as Map : null;
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    return _shell(
      tag: tag,
      title: title,
      icon: "💳",
      tint: KadeColors.teal,
      model: "credit",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              RingGauge(score: score),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _pill(
                      ready ? tr("✓ Ready to Apply") : tr("⚠️ Needs Improvement"),
                      ready ? KadeColors.success : KadeColors.amber,
                    ),
                    if (ready && maxLoan > 0) ...[
                      const SizedBox(height: 6),
                      Text(
                        "${tr("Loan limit")}: ${_lkr(maxLoan)}",
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: KadeColors.success,
                        ),
                      ),
                    ],
                    if (features != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        "${tr("In Business")}: ${features["months_active"]} ${tr("mos")}\n"
                        "${tr("Daily Sales")}: ${features["avg_daily_txns"]}  ·  "
                        "${tr("Profit Margin")}: ${features["profit_margin_pct"]}%",
                        style: TextStyle(fontSize: 12, color: sub, height: 1.4),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          InfluenceBars(explanation: (m["explanation"] is List) ? m["explanation"] as List : const []),
        ],
      ),
    );
  }

  /* ------------------------------ Sales forecast ------------------------------ */

  Widget _demandCard(Map m) {
    const tag = "Inventory", title = "Sales Forecast";
    if (m["available"] != true) {
      return _shell(
        tag: tag,
        title: title,
        icon: "📈",
        tint: KadeColors.amber,
        model: "demand",
        child: _unavailable(m),
      );
    }
    final items = (m["items"] is List) ? m["items"] as List : const [];
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    return _shell(
      tag: tag,
      title: title,
      icon: "📈",
      tint: KadeColors.amber,
      model: "demand",
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++)
            Builder(
              builder: (_) {
                final it = items[i] as Map;
                final f = it["forecast_units"];
                final hasForecast = f is num;
                final open = openItem == i && hasForecast;
                final history = ((it["history"] as List?) ?? const [])
                    .map((w) => (((w as Map)["units"] as num?) ?? 0).toDouble())
                    .toList();
                final needsReorder = ((it["quantity"] as num?) ?? 0) < ((it["reorder_level"] as num?) ?? 0);
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: KadeColors.teal.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(KadeRadius.md),
                  ),
                  child: Column(
                    children: [
                      InkWell(
                        borderRadius: BorderRadius.circular(KadeRadius.md),
                        onTap: hasForecast ? () => setState(() => openItem = open ? null : i) : null,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "${it["item"]}",
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                                    ),
                                    Text(
                                      "${tr("Stock:")} ${it["quantity"]} ${tr("· Reorder:")} ${it["reorder_level"]}",
                                      style: TextStyle(fontSize: 11, color: sub),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      needsReorder ? tr("🚩 Reorder now") : tr("✓ Adequate"),
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: needsReorder ? KadeColors.terra : KadeColors.success,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              hasForecast
                                  ? Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          "≈ ${f.toStringAsFixed(0)}",
                                          style: const TextStyle(
                                            fontSize: 22,
                                            fontWeight: FontWeight.w800,
                                            color: KadeColors.teal,
                                          ),
                                        ),
                                        Text(
                                          tr("units / next wk"),
                                          style: TextStyle(fontSize: 10, color: sub),
                                        ),
                                      ],
                                    )
                                  : Text(
                                      tr("No sales data yet"),
                                      style: TextStyle(fontSize: 11, color: sub, fontStyle: FontStyle.italic),
                                    ),
                              if (hasForecast) Icon(open ? Icons.expand_less : Icons.expand_more, color: sub),
                            ],
                          ),
                        ),
                      ),
                      if (open && history.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
                          child: ForecastChart(history: history, forecast: f.toDouble()),
                        ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  /* -------------------------------- Buy or wait ------------------------------- */

  Widget _procurementCard(Map m) {
    const tag = "Purchasing", title = "Should I Buy?";
    if (m["available"] != true) {
      return _shell(
        tag: tag,
        title: title,
        icon: "🛒",
        tint: KadeColors.terra,
        model: "procurement",
        child: _unavailable(m),
      );
    }
    final items = (m["items"] is List) ? m["items"] as List : const [];
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    return _shell(
      tag: tag,
      title: title,
      icon: "🛒",
      tint: KadeColors.terra,
      model: "procurement",
      child: Column(
        children: [
          for (final raw in items)
            Builder(
              builder: (_) {
                final it = raw as Map;
                final buy = it["action"] == "BUY";
                final ctx = "${it["price_context"] ?? ""}";
                final reorderText = it["decision_basis"] == "forecast"
                    ? "${it["forecast_reorder_level"]} (≈${(it["forecast_units"] as num).round()}${tr("/week forecast")})"
                    : "${it["reorder_level"]}";
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(KadeRadius.md),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "${it["item"]}",
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                                ),
                                Text(
                                  "${tr("Stock:")} ${it["quantity"]} ${tr("· Reorder:")} $reorderText",
                                  style: TextStyle(fontSize: 11, color: sub),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: buy ? KadeColors.accent : Colors.grey.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              buy ? tr("🛒 Buy") : tr("⏳ Wait"),
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: buy ? Colors.white : Colors.grey,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (ctx.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          "${buy ? tr("Stock low — restock needed.") : tr("Enough stock.")} ${tr(ctx)}",
                          style: TextStyle(fontSize: 11, color: sub, fontStyle: FontStyle.italic),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  /* ----------------------------- Account activity ----------------------------- */

  Widget _anomalyCard(Map m) {
    const tag = "Security", title = "Account Activity";
    if (m["available"] != true) {
      return _shell(
        tag: tag,
        title: title,
        icon: "🛡️",
        tint: Colors.blue,
        model: "anomaly",
        child: _unavailable(m),
      );
    }
    final flagged = m["prediction"] == 1;
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    return _shell(
      tag: tag,
      title: title,
      icon: "🛡️",
      tint: Colors.blue,
      model: "anomaly",
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "${tr("Most recent transaction")}: ${m["customer"]} · ${_lkr((m["amount"] as num?) ?? 0)}",
            style: TextStyle(fontSize: 12, color: sub),
          ),
          const SizedBox(height: 10),
          _pill(
            flagged ? tr("⚠ Looks unusual") : tr("✓ Looks normal"),
            flagged ? KadeColors.terra : KadeColors.success,
          ),
          if (flagged) ...[
            const SizedBox(height: 8),
            Text(
              tr("This looks different from your usual pattern — worth a quick check."),
              style: const TextStyle(fontSize: 12, color: KadeColors.terra),
            ),
          ],
          InfluenceBars(explanation: (m["explanation"] is List) ? m["explanation"] as List : const []),
        ],
      ),
    );
  }
}
