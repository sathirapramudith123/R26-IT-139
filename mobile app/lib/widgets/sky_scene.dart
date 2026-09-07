import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Animated time-of-day sky scene for the dashboard hero.
/// Morning: mountains + rising sun · Afternoon: city + clouds ·
/// Evening: sun setting into the sea · Night: city lights + moon + stars.
///
/// Usage:  SkyScene(phase: SkyPhase.morning, height: 150)
enum SkyPhase { morning, afternoon, evening, night }

SkyPhase skyPhaseForHour(int hour) {
  if (hour >= 5 && hour < 12) return SkyPhase.morning;
  if (hour >= 12 && hour < 17) return SkyPhase.afternoon;
  if (hour >= 17 && hour < 21) return SkyPhase.evening;
  return SkyPhase.night;
}

class SkyScene extends StatefulWidget {
  final SkyPhase phase;
  final double height;
  const SkyScene({super.key, required this.phase, this.height = 150});

  @override
  State<SkyScene> createState() => _SkySceneState();
}

class _SkySceneState extends State<SkyScene> with SingleTickerProviderStateMixin {
  late final AnimationController _c; // single controller drives everything

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(seconds: 6))..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.only(
        bottomLeft: Radius.circular(28), bottomRight: Radius.circular(28)),
      child: SizedBox(
        height: widget.height,
        width: double.infinity,
        child: RepaintBoundary(
          child: AnimatedBuilder(
            animation: _c,
            builder: (context, _) => CustomPaint(
              size: Size(double.infinity, widget.height),
              // intro folded into the loop: first ~30% of the cycle acts as the
              // sun rise/set, so no second controller is needed.
              painter: _SkyPainter(
                phase: widget.phase,
                t: _c.value,
                intro: (_c.value / 0.3).clamp(0.0, 1.0),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SkyPainter extends CustomPainter {
  final SkyPhase phase;
  final double t;      // looping 0..1
  final double intro;  // one-shot 0..1
  _SkyPainter({required this.phase, required this.t, required this.intro});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;

    // ---- sky gradient ----
    final sky = _skyColors(phase);
    final rect = Offset.zero & size;
    canvas.drawRect(rect, Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft, end: Alignment.bottomRight, colors: sky,
      ).createShader(rect));

    switch (phase) {
      case SkyPhase.morning:   _paintMorning(canvas, w, h); break;
      case SkyPhase.afternoon: _paintAfternoon(canvas, w, h); break;
      case SkyPhase.evening:   _paintEvening(canvas, w, h); break;
      case SkyPhase.night:     _paintNight(canvas, w, h); break;
    }
  }

  List<Color> _skyColors(SkyPhase p) {
    switch (p) {
      case SkyPhase.morning:   return [const Color(0xFFFDE68A), const Color(0xFFFDBA74), const Color(0xFF5EEAD4)];
      case SkyPhase.afternoon: return [const Color(0xFF7DD3FC), const Color(0xFF38BDF8), const Color(0xFF22D3EE)];
      case SkyPhase.evening:   return [const Color(0xFFFB923C), const Color(0xFFF43F5E), const Color(0xFF7C3AED)];
      case SkyPhase.night:     return [const Color(0xFF312E81), const Color(0xFF4C1D95), const Color(0xFF0F172A)];
    }
  }

  // ---- SUN ----
  void _sun(Canvas c, Offset center, double r, {bool rays = true}) {
    if (rays) {
      final rayPaint = Paint()
        ..color = const Color(0xFFFDE047).withOpacity(0.22)
        ..strokeWidth = 3;
      for (int i = 0; i < 12; i++) {
        final a = (i / 12) * 2 * math.pi + t * 2 * math.pi * 0.15;
        final p1 = center + Offset(math.cos(a), math.sin(a)) * (r + 6);
        final p2 = center + Offset(math.cos(a), math.sin(a)) * (r + 16);
        c.drawLine(p1, p2, rayPaint);
      }
    }
    // glow
    c.drawCircle(center, r + 10, Paint()
      ..shader = RadialGradient(colors: [
        const Color(0xFFFDE047).withOpacity(0.4), Colors.transparent,
      ]).createShader(Rect.fromCircle(center: center, radius: r + 12)));
    // core
    c.drawCircle(center, r, Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.3, -0.3),
        colors: [const Color(0xFFFFFBEB), const Color(0xFFFDE047), const Color(0xFFFBBF24)],
      ).createShader(Rect.fromCircle(center: center, radius: r)));
  }

  // ---- MORNING — mountains + sun rising between them ----
  void _paintMorning(Canvas c, double w, double h) {
    // sun rises from behind mountains
    final sunY = h * 0.55 - intro * (h * 0.30);
    _sun(c, Offset(w * 0.62, sunY), 26);

    // mountains (3 layers)
    _mountains(c, w, h, [
      _MtnLayer(0.42, const Color(0x28FFFFFF), [0.0, 0.55, 0.35, 0.75, 0.30, 0.70]),
      _MtnLayer(0.55, const Color(0x730F766E), [0.0, 0.7, 0.55, 0.85, 0.5, 0.78]),
      _MtnLayer(0.68, const Color(0xD9064E4A), [0.0, 0.82, 0.6, 0.9, 0.55, 0.85]),
    ]);
    _clouds(c, w, h, 0.85);
  }

  // ---- AFTERNOON — city skyline + clouds ----
  void _paintAfternoon(Canvas c, double w, double h) {
    _sun(c, Offset(w * 0.78, h * 0.28), 24, rays: false);
    // green mountains (3 layers for depth)
    _mountains(c, w, h, [
      _MtnLayer(0.42, const Color(0x33FFFFFF), [0.0, 0.52, 0.36, 0.70, 0.32, 0.66]),
      _MtnLayer(0.55, const Color(0x4D0E7490), [0.0, 0.66, 0.5, 0.80, 0.46, 0.75]),
      _MtnLayer(0.68, const Color(0xB30E7490), [0.0, 0.80, 0.58, 0.88, 0.52, 0.84]),
    ]);
    _clouds(c, w, h, 1.0);
  }

  // ---- EVENING — sun setting into the sea ----
  void _paintEvening(Canvas c, double w, double h) {
    final seaTop = h * 0.66;
    // sun slides down toward the horizon
    final sunY = seaTop - 34 + intro * 40;
    _sun(c, Offset(w * 0.5, sunY), 26);

    // sea
    c.drawRect(Rect.fromLTWH(0, seaTop, w, h - seaTop),
        Paint()..color = const Color(0x8C1E1B4B));
    // horizon highlight
    c.drawRect(Rect.fromLTWH(0, seaTop, w, 2),
        Paint()..color = const Color(0xFFFDE047).withOpacity(0.6));
    // shimmering reflection column
    for (int i = 0; i < 3; i++) {
      final ww = (8 - i * 2).toDouble();
      final shimmer = 0.4 + 0.4 * math.sin(t * 2 * math.pi + i);
      final path = Path()
        ..moveTo(w * 0.5 - ww, seaTop)
        ..quadraticBezierTo(w * 0.5, h, w * 0.5 + ww, seaTop)
        ..close();
      c.drawPath(path, Paint()..color = const Color(0xFFFBBF24).withOpacity(shimmer.clamp(0.0, 0.85)));
    }
    // moving wave lines
    _waves(c, w, seaTop);
  }

  // ---- NIGHT — city lights + moon + stars ----
  void _paintNight(Canvas c, double w, double h) {
    // moon
    final moon = Offset(w * 0.72, h * 0.30);
    c.drawCircle(moon, 22, Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.3, -0.3),
        colors: [const Color(0xFFF8FAFC), const Color(0xFFCBD5E1), const Color(0xFF94A3B8)],
      ).createShader(Rect.fromCircle(center: moon, radius: 22)));
    final crater = Paint()..color = const Color(0x59647488);
    c.drawCircle(moon + const Offset(-4, -3), 5, crater);
    c.drawCircle(moon + const Offset(6, 6), 3.5, crater);
    c.drawCircle(moon + const Offset(4, -6), 2.5, crater);

    // stars (twinkle)
    final rnd = math.Random(7);
    final star = Paint()..color = Colors.white;
    for (int i = 0; i < 22; i++) {
      final sx = rnd.nextDouble() * w;
      final sy = rnd.nextDouble() * h * 0.7;
      final tw = 0.3 + 0.7 * (0.5 + 0.5 * math.sin(t * 2 * math.pi + i));
      star.color = Colors.white.withOpacity(tw);
      c.drawCircle(Offset(sx, sy), 1.4 + tw, star);
    }

    // dark mountains (silhouette, 3 layers)
    _mountains(c, w, h, [
      _MtnLayer(0.45, const Color(0x40312E81), [0.0, 0.52, 0.38, 0.68, 0.34, 0.64]),
      _MtnLayer(0.58, const Color(0x730F172A), [0.0, 0.66, 0.52, 0.78, 0.48, 0.74]),
      _MtnLayer(0.70, const Color(0xD90F172A), [0.0, 0.80, 0.58, 0.88, 0.52, 0.84]),
    ]);
  }

  // ---------- helpers ----------
  void _mountains(Canvas c, double w, double h, List<_MtnLayer> layers) {
    for (final L in layers) {
      final base = h;
      final path = Path()..moveTo(0, base);
      final pts = L.pts;
      path.lineTo(0, h * pts[1]);
      path.lineTo(w * 0.25, h * pts[2]);
      path.lineTo(w * 0.42, h * pts[3]);
      path.lineTo(w * 0.6, h * pts[4]);
      path.lineTo(w * 0.78, h * pts[5]);
      path.lineTo(w, h * (pts[3] - 0.1));
      path.lineTo(w, base);
      path.close();
      c.drawPath(path, Paint()..color = L.color);
    }
  }

  void _city(Canvas c, double w, double h, Color color) {
    final paint = Paint()..color = color;
    final heights = [0.46, 0.62, 0.38, 0.72, 0.5, 0.8, 0.5, 0.6, 0.4, 0.55, 0.7, 0.46, 0.58];
    final n = heights.length;
    final bw = w / n;
    for (int i = 0; i < n; i++) {
      final bh = h * heights[i];
      final x = i * bw + bw * 0.12;
      final r = RRect.fromRectAndCorners(
        Rect.fromLTWH(x, h - bh, bw * 0.76, bh),
        topLeft: const Radius.circular(3), topRight: const Radius.circular(3));
      c.drawRRect(r, paint);
    }
  }

  void _cityWindows(Canvas c, double w, double h) {
    final heights = [0.46, 0.62, 0.38, 0.72, 0.5, 0.8, 0.5, 0.6, 0.4, 0.55, 0.7, 0.46, 0.58];
    final n = heights.length;
    final bw = w / n;
    final rnd = math.Random(3);
    for (int i = 0; i < n; i++) {
      final bh = h * heights[i];
      final x0 = i * bw + bw * 0.12;
      final top = h - bh;
      for (double yy = top + 6; yy < h - 6; yy += 10) {
        for (double xx = x0 + 3; xx < x0 + bw * 0.76 - 3; xx += 8) {
          if (rnd.nextDouble() < 0.5) continue;
          final flick = 0.5 + 0.5 * math.sin(t * 2 * math.pi + xx + yy);
          c.drawRect(Rect.fromLTWH(xx, yy, 3, 4),
              Paint()..color = const Color(0xFFFDE68A).withOpacity((0.5 + 0.4 * flick).clamp(0.0, 1.0)));
        }
      }
    }
  }

  void _clouds(Canvas c, double w, double h, double opacity) {
    final cloud = Paint()..color = Colors.white.withOpacity(0.55 * opacity);
    // drift across using t
    final dx = (t * w * 1.4) % (w + 120) - 120;
    _cloudBlob(c, Offset(dx, h * 0.22), 34, cloud);
    final dx2 = ((t + 0.5) * w * 1.1) % (w + 120) - 120;
    _cloudBlob(c, Offset(dx2, h * 0.4), 24, cloud);
  }

  void _cloudBlob(Canvas c, Offset o, double s, Paint p) {
    c.drawCircle(o, s * 0.5, p);
    c.drawCircle(o + Offset(s * 0.5, 4), s * 0.4, p);
    c.drawCircle(o + Offset(-s * 0.4, 5), s * 0.32, p);
    c.drawRRect(RRect.fromRectAndRadius(
      Rect.fromLTWH(o.dx - s * 0.5, o.dy + 2, s, s * 0.4), const Radius.circular(20)), p);
  }

  void _waves(Canvas c, double w, double seaTop) {
    final wave = Paint()
      ..color = Colors.white.withOpacity(0.16)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    for (int row = 0; row < 2; row++) {
      final y = seaTop + 14 + row * 12;
      final shift = (t * 40 * (row + 1)) % 40;
      final path = Path()..moveTo(-shift, y);
      for (double x = -shift; x < w + 40; x += 40) {
        path.relativeQuadraticBezierTo(10, -4, 20, 0);
        path.relativeQuadraticBezierTo(10, 4, 20, 0);
      }
      c.drawPath(path, wave);
    }
  }

  @override
  bool shouldRepaint(covariant _SkyPainter old) =>
      old.t != t || old.intro != intro || old.phase != phase;
}

class _MtnLayer {
  final double baseHeight;
  final Color color;
  final List<double> pts;
  _MtnLayer(this.baseHeight, this.color, this.pts);
}