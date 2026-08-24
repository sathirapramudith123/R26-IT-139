import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/theme.dart';

/// Shared visual building blocks for the prediction screens.
///
/// Place this file next to your prediction screens (or adjust the relative
/// import of `theme.dart` to match your folder layout). No extra packages
/// are needed — every chart here is drawn with Flutter's CustomPainter.

/* -------------------------------------------------------------------------- */
/*  Plain-language labels                                                      */
/* -------------------------------------------------------------------------- */

const Map<String, String> _featureLabels = {
  "months_active": "Time in business",
  "avg_daily_txns": "Daily sales count",
  "profit_margin_pct": "Profit margin",
  "total_revenue": "Total revenue",
  "outstanding_debt": "Outstanding debt",
  "recent_growth": "Recent growth",
  "seasonality": "Seasonal demand",
  "price_trend": "Price trend",
  "stock_level": "Current stock",
  "transaction_amount": "Transaction size",
  "transaction_time": "Time of transaction",
  "location_change": "Unusual location",
};

String humanizeFeature(String raw) {
  if (_featureLabels.containsKey(raw)) return _featureLabels[raw]!;
  final spaced = raw.replaceAll("_", " ").trim();
  if (spaced.isEmpty) return spaced;
  return spaced
      .split(" ")
      .map((w) => w.isEmpty ? w : "${w[0].toUpperCase()}${w.substring(1)}")
      .join(" ");
}

/* -------------------------------------------------------------------------- */
/*  Ring gauge (score out of 100)                                              */
/* -------------------------------------------------------------------------- */

class RingGauge extends StatelessWidget {
  final double score;
  final double size;
  const RingGauge({super.key, required this.score, this.size = 92});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final pct = score.clamp(0, 100).toDouble();
    final color = pct >= 70
        ? KadeColors.teal
        : (pct >= 40 ? KadeColors.amber : KadeColors.terra);
    final track = isDark ? Colors.white10 : const Color(0xFFECE3D5);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _RingPainter(pct: pct, color: color, track: track, stroke: 10),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(pct.toStringAsFixed(0),
                  style: TextStyle(
                      fontSize: size * 0.26,
                      fontWeight: FontWeight.w800,
                      fontFamily: "Nunito",
                      color: color)),
              const Text("out of 100",
                  style: TextStyle(fontSize: 9, color: Colors.grey)),
            ],
          ),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double pct;
  final Color color;
  final Color track;
  final double stroke;
  _RingPainter({required this.pct, required this.color, required this.track, required this.stroke});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.shortestSide - stroke) / 2;

    final trackPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..color = track;
    canvas.drawCircle(center, radius, trackPaint);

    final arcPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..color = color;
    final sweep = 2 * math.pi * (pct.clamp(0, 100) / 100);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      sweep,
      false,
      arcPaint,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.pct != pct || old.color != color || old.track != track;
}

/* -------------------------------------------------------------------------- */
/*  "What's affecting this" — diverging influence bars                         */
/*  Green = helping the result, red = holding it back.                         */
/* -------------------------------------------------------------------------- */

class InfluenceBars extends StatelessWidget {
  final List explanation;
  final int maxItems;
  const InfluenceBars({super.key, required this.explanation, this.maxItems = 4});

  @override
  Widget build(BuildContext context) {
    final items = explanation.whereType<Map>().map((e) {
      final impact = (e["impact"] is num) ? (e["impact"] as num).toDouble() : 0.0;
      return _Factor(humanizeFeature("${e["feature"]}"), impact);
    }).toList()
      ..sort((a, b) => b.impact.abs().compareTo(a.impact.abs()));

    final shown = items.take(maxItems).toList();
    if (shown.isEmpty) return const SizedBox.shrink();

    final maxImpact = shown
        .map((e) => e.impact.abs())
        .fold<double>(0.01, (p, c) => c > p ? c : p);
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Text("What's affecting this",
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: sub)),
            const Spacer(),
            _legendDot(KadeColors.teal, "Helping"),
            const SizedBox(width: 10),
            _legendDot(KadeColors.terra, "Holding back"),
          ]),
          const SizedBox(height: 10),
          ...shown.map((f) {
            final factor = (f.impact.abs() / maxImpact).clamp(0.0, 1.0);
            final positive = f.impact >= 0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(children: [
                SizedBox(
                  width: 104,
                  child: Text(f.label,
                      style: const TextStyle(fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ),
                Expanded(
                  child: SizedBox(
                    height: 14,
                    child: Row(children: [
                      Expanded(
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: FractionallySizedBox(
                            widthFactor: positive ? 0.0 : factor,
                            child: _bar(KadeColors.terra, roundedLeft: true),
                          ),
                        ),
                      ),
                      Container(width: 1.5, height: 14, color: sub?.withOpacity(0.3)),
                      Expanded(
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: FractionallySizedBox(
                            widthFactor: positive ? factor : 0.0,
                            child: _bar(KadeColors.teal, roundedLeft: false),
                          ),
                        ),
                      ),
                    ]),
                  ),
                ),
              ]),
            );
          }),
        ],
      ),
    );
  }

  Widget _legendDot(Color c, String t) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
          const SizedBox(width: 4),
          Text(t, style: TextStyle(fontSize: 10, color: c, fontWeight: FontWeight.w600)),
        ],
      );

  Widget _bar(Color c, {required bool roundedLeft}) => Container(
        height: 10,
        decoration: BoxDecoration(
          color: c,
          borderRadius: BorderRadius.horizontal(
            left: Radius.circular(roundedLeft ? 6 : 0),
            right: Radius.circular(roundedLeft ? 0 : 6),
          ),
        ),
      );
}

class _Factor {
  final String label;
  final double impact;
  _Factor(this.label, this.impact);
}

/* -------------------------------------------------------------------------- */
/*  Trend line (e.g. weekly sales history + forecast)                          */
/* -------------------------------------------------------------------------- */

class MiniTrendChart extends StatelessWidget {
  final List<double> values;
  final List<String> labels;
  final Color color;
  const MiniTrendChart({
    super.key,
    required this.values,
    required this.labels,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    if (values.length < 2) return const SizedBox.shrink();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        SizedBox(
          height: 120,
          width: double.infinity,
          child: CustomPaint(painter: _TrendPainter(values, color, isDark)),
        ),
        const SizedBox(height: 6),
        Row(
          children: labels
              .map((l) => Expanded(
                    child: Text(l,
                        style: const TextStyle(fontSize: 9, color: Colors.grey),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ))
              .toList(),
        ),
      ],
    );
  }
}

class _TrendPainter extends CustomPainter {
  final List<double> values;
  final Color color;
  final bool isDark;
  _TrendPainter(this.values, this.color, this.isDark);

  @override
  void paint(Canvas canvas, Size size) {
    final minV = values.reduce(math.min);
    final maxV = values.reduce(math.max);
    final range = (maxV - minV) == 0 ? 1.0 : (maxV - minV);
    const pad = 10.0;
    final w = size.width - pad * 2;
    final h = size.height - pad * 2;

    Offset pt(int i) {
      final x = pad + (values.length == 1 ? 0 : w * i / (values.length - 1));
      final y = pad + h * (1 - (values[i] - minV) / range);
      return Offset(x, y);
    }

    // Faint horizontal guide lines.
    final grid = Paint()
      ..color = (isDark ? Colors.white : Colors.black).withOpacity(0.06)
      ..strokeWidth = 1;
    for (int g = 0; g <= 2; g++) {
      final yy = pad + h * g / 2;
      canvas.drawLine(Offset(pad, yy), Offset(size.width - pad, yy), grid);
    }

    // Line path.
    final line = Path()..moveTo(pt(0).dx, pt(0).dy);
    for (int i = 1; i < values.length; i++) {
      line.lineTo(pt(i).dx, pt(i).dy);
    }

    // Soft fill under the line.
    final area = Path.from(line)
      ..lineTo(pt(values.length - 1).dx, size.height - pad)
      ..lineTo(pt(0).dx, size.height - pad)
      ..close();
    canvas.drawPath(area, Paint()..color = color.withOpacity(0.12));

    canvas.drawPath(
      line,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeJoin = StrokeJoin.round
        ..strokeCap = StrokeCap.round,
    );

    // Points — last one (the forecast) is emphasised.
    for (int i = 0; i < values.length; i++) {
      final last = i == values.length - 1;
      if (last) {
        canvas.drawCircle(pt(i), 8, Paint()..color = color.withOpacity(0.25));
      }
      canvas.drawCircle(pt(i), last ? 5 : 3, Paint()..color = color);
    }
  }

  @override
  bool shouldRepaint(_TrendPainter old) => old.values != values || old.color != color;
}