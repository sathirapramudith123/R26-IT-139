// "Next level" pieces of the Predictions screen (same features as the web page):
// forecast chart with a likely-range band, what-if simulator, action plan and model trust.
import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import '../../services/insights_service.dart';
import 'prediction_widgets.dart';

/* -------------------------------------------------------------------------- */
/*  How each model was tested (from the model cards in "ML model/")             */
/* -------------------------------------------------------------------------- */

class ModelTrust {
  final String name, model, headline, detail;
  const ModelTrust(this.name, this.model, this.headline, this.detail);
}

const modelTrust = {
  "credit": ModelTrust(
    "Credit Score",
    "Logistic Regression",
    "Beats the usual bank rules: F1 0.75 vs 0.68",
    "ROC-AUC 0.839 on shops it never saw — 99.9% of the best possible on this data.",
  ),
  "demand": ModelTrust(
    "Sales Forecast",
    "Random Forest",
    "21.7% more accurate than “same as last week”",
    "64% better right after Avurudu. Usually off by about 11 units a week.",
  ),
  "procurement": ModelTrust(
    "Should I Buy?",
    "Random Forest",
    "Following it saves about 2.2% of the purchase bill",
    "ROC-AUC 0.795, tested on later weeks than it learned from.",
  ),
  "anomaly": ModelTrust(
    "Account Activity",
    "XGBoost + Isolation Forest",
    "False alarms down from 136 to 19 per 1,000 honest customers",
    "CBSL limits are always enforced; the model catches what the limits cannot.",
  ),
};

const demandMae = 11.0; // typical weekly forecast error (test MAE, units)

String _money(num v) {
  final s = v.abs().round().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ",");
  return "${v < 0 ? "-" : ""}LKR $s";
}

/// One line under a prediction card: how the model behind it was tested
class TrustLine extends StatelessWidget {
  final String model;
  const TrustLine({super.key, required this.model});

  @override
  Widget build(BuildContext context) {
    final m = modelTrust[model]!;
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.science_outlined, size: 14, color: KadeColors.teal),
          const SizedBox(width: 6),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: "${tr(m.model)} · ",
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  TextSpan(text: tr(m.headline)),
                ],
              ),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}

/// "How sure are these predictions?" — all four models
class ModelTrustPanel extends StatelessWidget {
  const ModelTrustPanel({super.key});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.verified_user_outlined, color: KadeColors.teal),
                const SizedBox(width: 8),
                Expanded(child: Text(tr("How sure are these predictions?"), style: text.titleMedium)),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              tr("Each model was tested on data it had never seen and compared with a simple rule."),
              style: text.bodySmall,
            ),
            const SizedBox(height: 12),
            for (final m in modelTrust.values)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: KadeColors.teal.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(KadeRadius.md),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "${tr(m.name)} · ${tr(m.model)}",
                      style: text.labelMedium?.copyWith(color: KadeColors.teal),
                    ),
                    const SizedBox(height: 4),
                    Text(tr(m.headline), style: text.titleSmall),
                    Text(tr(m.detail), style: text.bodySmall),
                  ],
                ),
              ),
            Text(
              tr(
                "Models were trained on public and simulated data, so the comparisons are fair but the exact numbers are not real-world guarantees.",
              ),
              style: text.bodySmall?.copyWith(fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  Forecast chart: 8 weeks sold + next week's forecast with a likely range    */
/* -------------------------------------------------------------------------- */

class ForecastChart extends StatelessWidget {
  final List<double> history; // oldest first
  final double forecast;
  const ForecastChart({super.key, required this.history, required this.forecast});

  @override
  Widget build(BuildContext context) {
    if (history.isEmpty) return const SizedBox.shrink();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final small = Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10);
    Widget legend(Color c, String label, {bool dashed = false, bool box = false}) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 14,
          height: box ? 8 : 2.5,
          decoration: BoxDecoration(
            color: box ? c.withValues(alpha: 0.18) : (dashed ? null : c),
            border: dashed ? Border(top: BorderSide(color: c, width: 2.5)) : null,
          ),
        ),
        const SizedBox(width: 4),
        Text(label, style: small),
      ],
    );
    return Column(
      children: [
        SizedBox(
          height: 140,
          width: double.infinity,
          child: CustomPaint(painter: _ForecastPainter(history, forecast, isDark)),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 12,
          children: [
            legend(KadeColors.teal, tr("Sold")),
            legend(KadeColors.accent, tr("Forecast"), dashed: true),
            legend(KadeColors.teal, tr("Likely range"), box: true),
          ],
        ),
      ],
    );
  }
}

class _ForecastPainter extends CustomPainter {
  final List<double> history;
  final double forecast;
  final bool isDark;
  _ForecastPainter(this.history, this.forecast, this.isDark);

  @override
  void paint(Canvas canvas, Size size) {
    final hi = forecast + demandMae;
    final lo = math.max(0.0, forecast - demandMae);
    final maxV = math.max(hi, history.reduce(math.max)) * 1.1 + 1;
    const pad = 8.0;
    final n = history.length + 1; // + next week
    final w = size.width - pad * 2, h = size.height - pad * 2;
    Offset pt(int i, double v) => Offset(pad + w * i / (n - 1), pad + h * (1 - v / maxV));

    final grid = Paint()
      ..color = (isDark ? Colors.white : Colors.black).withValues(alpha: 0.06)
      ..strokeWidth = 1;
    for (var g = 0; g <= 3; g++) {
      canvas.drawLine(Offset(pad, pad + h * g / 3), Offset(size.width - pad, pad + h * g / 3), grid);
    }

    // likely-range band from the last real week to next week
    final last = history.length - 1;
    final band = Path()
      ..moveTo(pt(last, history[last]).dx, pt(last, history[last]).dy)
      ..lineTo(pt(n - 1, hi).dx, pt(n - 1, hi).dy)
      ..lineTo(pt(n - 1, lo).dx, pt(n - 1, lo).dy)
      ..close();
    canvas.drawPath(band, Paint()..color = KadeColors.teal.withValues(alpha: 0.14));

    // actual sales
    final line = Path()..moveTo(pt(0, history[0]).dx, pt(0, history[0]).dy);
    for (var i = 1; i < history.length; i++) {
      line.lineTo(pt(i, history[i]).dx, pt(i, history[i]).dy);
    }
    canvas.drawPath(
      line,
      Paint()
        ..color = KadeColors.teal
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..strokeJoin = StrokeJoin.round,
    );
    for (var i = 0; i < history.length; i++) {
      canvas.drawCircle(pt(i, history[i]), 3, Paint()..color = KadeColors.teal);
    }

    // dashed forecast segment
    final a = pt(last, history[last]), b = pt(n - 1, forecast);
    final dash = Paint()
      ..color = KadeColors.accent
      ..strokeWidth = 2.5;
    const seg = 6.0;
    final len = (b - a).distance;
    for (var d = 0.0; d < len; d += seg * 1.7) {
      final t0 = d / len, t1 = math.min(1.0, (d + seg) / len);
      canvas.drawLine(Offset.lerp(a, b, t0)!, Offset.lerp(a, b, t1)!, dash);
    }
    canvas.drawCircle(b, 7, Paint()..color = KadeColors.accent.withValues(alpha: 0.3));
    canvas.drawCircle(b, 4.5, Paint()..color = KadeColors.accent);
  }

  @override
  bool shouldRepaint(_ForecastPainter old) => old.history != history || old.forecast != forecast;
}

/* -------------------------------------------------------------------------- */
/*  What-if simulator                                                           */
/* -------------------------------------------------------------------------- */

class _Slider {
  final String key, label;
  final double min, max, step;
  final String Function(double) fmt;
  const _Slider(this.key, this.label, this.min, this.max, this.step, this.fmt);
}

class WhatIfCard extends StatefulWidget {
  final Map features;
  final double baseScore;
  final String baseStatus;
  final num baseLimit;
  const WhatIfCard({
    super.key,
    required this.features,
    required this.baseScore,
    required this.baseStatus,
    required this.baseLimit,
  });

  @override
  State<WhatIfCard> createState() => _WhatIfCardState();
}

class _WhatIfCardState extends State<WhatIfCard> {
  late final Map<String, double> start;
  late Map<String, double> values;
  late final List<_Slider> sliders;
  Map<String, dynamic>? result;
  bool busy = false;
  Timer? timer;

  double _f(String k) => (widget.features[k] is num) ? (widget.features[k] as num).toDouble() : 0;

  @override
  void initState() {
    super.initState();
    double big(double v) => math.max(50000, (v * 2.5).roundToDouble());
    sliders = [
      _Slider(
        "monthly_revenue_rs",
        "Monthly sales (LKR)",
        0,
        big(_f("monthly_revenue_rs")),
        1000,
        (v) => _money(v),
      ),
      _Slider(
        "monthly_expenses_rs",
        "Monthly expenses (LKR)",
        0,
        big(_f("monthly_expenses_rs")),
        1000,
        (v) => _money(v),
      ),
      _Slider(
        "avg_daily_txns",
        "Sales per day",
        0,
        math.max(10, (_f("avg_daily_txns") * 3).ceilToDouble()),
        0.5,
        (v) => v.toStringAsFixed(1),
      ),
      _Slider("digital_payment_ratio", "Paid digitally", 0, 1, 0.05, (v) => "${(v * 100).round()}%"),
      _Slider("stockout_rate", "Items out of stock", 0, 1, 0.05, (v) => "${(v * 100).round()}%"),
      _Slider(
        "months_active",
        "Months in business",
        1,
        math.max(36, _f("months_active") + 12),
        1,
        (v) => v.toStringAsFixed(0),
      ),
    ];
    start = {for (final s in sliders) s.key: _f(s.key).clamp(s.min, s.max).toDouble()};
    values = Map.of(start);
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  bool get changed => sliders.any((s) => values[s.key] != start[s.key]);

  void _set(String key, double v) {
    setState(() => values[key] = v);
    timer?.cancel();
    if (!changed) {
      setState(() => result = null);
      return;
    }
    timer = Timer(const Duration(milliseconds: 450), () async {
      setState(() => busy = true);
      try {
        final r = await InsightsService.creditWhatIf(values);
        if (mounted) setState(() => result = r);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$e")));
        }
      } finally {
        if (mounted) setState(() => busy = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final scenario = result?["scenario"] as Map?;
    final score = (scenario?["credit_score"] as num?)?.toDouble() ?? widget.baseScore;
    final delta = (result?["delta"] as num?)?.toDouble() ?? 0;
    final status = "${scenario?["status"] ?? widget.baseStatus}";
    final limit = (scenario?["max_loan_limit_lkr"] as num?) ?? widget.baseLimit;
    final ready = status.startsWith("APPROVED");
    final profit = values["monthly_revenue_rs"]! - values["monthly_expenses_rs"]!;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.auto_awesome, color: KadeColors.teal),
                const SizedBox(width: 8),
                Expanded(child: Text(tr("What if…?"), style: text.titleMedium)),
                if (changed)
                  TextButton.icon(
                    onPressed: () => setState(() {
                      values = Map.of(start);
                      result = null;
                    }),
                    icon: const Icon(Icons.restart_alt, size: 18),
                    label: Text(tr("Reset")),
                  ),
              ],
            ),
            Text(
              tr(
                "Move the sliders to see how your credit score would change. The AI model re-scores your shop.",
              ),
              style: text.bodySmall,
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: KadeColors.headerGradient),
                borderRadius: BorderRadius.circular(KadeRadius.lg),
              ),
              child: Row(
                children: [
                  _scoreCol(tr("Today"), widget.baseScore, 22),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10),
                    child: Icon(Icons.arrow_forward, color: Colors.white70, size: 18),
                  ),
                  Opacity(opacity: busy ? 0.5 : 1, child: _scoreCol(tr("What if"), score, 32)),
                  if (changed && result != null && !busy) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: delta > 0
                            ? KadeColors.accent
                            : (delta < 0 ? KadeColors.terra : Colors.white24),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        "${delta > 0 ? "+" : ""}${delta.toStringAsFixed(1)}",
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        ready ? tr("✓ Ready to Apply") : tr("⚠️ Needs Improvement"),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "${tr("Loan limit")}: ${_money(limit)}",
                        style: const TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            for (final s in sliders) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(child: Text(tr(s.label), style: text.bodySmall)),
                  Text(
                    s.fmt(values[s.key]!),
                    style: text.labelLarge?.copyWith(
                      color: values[s.key] != start[s.key] ? KadeColors.teal : null,
                    ),
                  ),
                ],
              ),
              Slider(
                value: values[s.key]!,
                min: s.min,
                max: s.max,
                divisions: ((s.max - s.min) / s.step).round().clamp(1, 1000),
                onChanged: (v) => _set(s.key, v),
              ),
            ],
            Text(
              "${tr("Monthly profit in this scenario")}: ${_money(profit)}",
              style: text.bodySmall?.copyWith(color: profit >= 0 ? KadeColors.success : KadeColors.terra),
            ),
          ],
        ),
      ),
    );
  }

  Widget _scoreCol(String label, double v, double size) => Column(
    children: [
      Text(label.toUpperCase(), style: const TextStyle(color: Colors.white70, fontSize: 9, letterSpacing: 1)),
      Text(
        v.toStringAsFixed(0),
        style: TextStyle(color: Colors.white, fontSize: size, fontWeight: FontWeight.w700),
      ),
    ],
  );
}

/* -------------------------------------------------------------------------- */
/*  Action plan: why the score is low + steps scored by the model              */
/* -------------------------------------------------------------------------- */

const _tips = {
  "stockout_rate": "Running out of stock lowers your score — reorder popular items earlier.",
  "digital_payment_ratio": "Card, QR and bank payments build a record that banks trust.",
  "digital_revenue_volume": "Card, QR and bank payments build a record that banks trust.",
  "sales_volatility": "Very uneven daily sales look risky — steadier sales help.",
  "avg_daily_txns": "Record every sale — more sales per day lifts the score.",
  "profit_margin_pct": "A thin margin hurts — check your prices and cut waste.",
  "cash_flow_margin": "A thin margin hurts — check your prices and cut waste.",
  "monthly_expenses_rs": "High monthly expenses eat your profit — look for costs to cut.",
  "monthly_profit_rs": "More monthly profit means you can repay a loan more easily.",
  "net_cash_flow": "More monthly profit means you can repay a loan more easily.",
  "monthly_revenue_rs": "Higher monthly sales show the business can carry a loan.",
  "revenue_per_active_month": "Higher monthly sales show the business can carry a loan.",
  "months_active": "Time in business counts — keep recording, the score grows with your history.",
  "debt_to_income_ratio": "Paying down existing debt improves your score.",
};

class ActionPlanCard extends StatefulWidget {
  final List explanation;
  const ActionPlanCard({super.key, required this.explanation});

  @override
  State<ActionPlanCard> createState() => _ActionPlanCardState();
}

class _ActionPlanCardState extends State<ActionPlanCard> {
  List actions = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    InsightsService.creditActions()
        .then((r) {
          if (mounted) setState(() => actions = (r["actions"] is List) ? r["actions"] as List : []);
        })
        .catchError((_) {})
        .whenComplete(() {
          if (mounted) setState(() => loading = false);
        });
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final back = widget.explanation.whereType<Map>().where((f) => ((f["impact"] as num?) ?? 0) < 0).toList()
      ..sort((a, b) => ((a["impact"] as num?) ?? 0).compareTo((b["impact"] as num?) ?? 0));

    Widget box(Color c, Widget child) => Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(KadeRadius.md),
      ),
      child: child,
    );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.checklist, color: KadeColors.teal),
                const SizedBox(width: 8),
                Text(tr("Your action plan"), style: text.titleMedium),
              ],
            ),
            Text(
              tr("What is holding your credit score back, and the steps that would raise it most."),
              style: text.bodySmall,
            ),
            const SizedBox(height: 14),
            Text(
              tr("Holding you back").toUpperCase(),
              style: text.labelSmall?.copyWith(color: KadeColors.terra, letterSpacing: 1),
            ),
            const SizedBox(height: 6),
            if (back.isEmpty)
              Text(tr("Nothing is pulling your score down much right now. 👏"), style: text.bodySmall)
            else
              for (final f in back.take(3))
                box(
                  KadeColors.terra,
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(tr(humanizeFeature("${f["feature"]}")), style: text.titleSmall),
                      Text(
                        tr(_tips["${f["feature"]}"] ?? "This measure is lowering your score."),
                        style: text.bodySmall,
                      ),
                    ],
                  ),
                ),
            const SizedBox(height: 10),
            Text(
              tr("Do this next").toUpperCase(),
              style: text.labelSmall?.copyWith(color: KadeColors.success, letterSpacing: 1),
            ),
            const SizedBox(height: 6),
            if (loading)
              Text(tr("Calculating..."), style: text.bodySmall)
            else if (actions.isEmpty)
              Text(
                tr("No single step would raise your score much — keep recording sales and stock."),
                style: text.bodySmall,
              )
            else ...[
              for (var i = 0; i < actions.length; i++)
                box(
                  KadeColors.success,
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 13,
                        backgroundColor: KadeColors.success,
                        child: Text(
                          "${i + 1}",
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Text(tr("${actions[i]["title"]}"), style: text.bodyMedium)),
                      Text(
                        "+${actions[i]["delta"]}",
                        style: const TextStyle(color: KadeColors.success, fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
              Text(
                tr("Points = how much the AI model's score rises if you make that one change."),
                style: text.bodySmall?.copyWith(fontSize: 11),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
