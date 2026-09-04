import 'dart:async';
import 'package:flutter/material.dart';
import '../core/theme.dart';

/// Animated splash screen shown while the app boots.
/// Logo fades + scales in, a spinner runs underneath, then it routes onward.
///
/// Usage in main.dart:
///   home: SplashScreen(next: () => const DashboardScreen()),
/// or with a login check:
///   home: SplashScreen(next: () => token != null ? Dashboard() : LoginScreen()),
class SplashScreen extends StatefulWidget {
  final Widget Function() next;          // what to open after the splash
  final Duration duration;               // how long to show it
  const SplashScreen({super.key, required this.next, this.duration = const Duration(milliseconds: 2600)});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late final AnimationController _logoCtrl;   // fade + scale
  late final AnimationController _pulseCtrl;  // subtle breathing loop
  late final Animation<double> _fade;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();

    _logoCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));
    _fade  = CurvedAnimation(parent: _logoCtrl, curve: Curves.easeIn);
    _scale = Tween<double>(begin: 0.7, end: 1.0)
        .animate(CurvedAnimation(parent: _logoCtrl, curve: Curves.elasticOut));
    _logoCtrl.forward();

    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))
      ..repeat(reverse: true);

    // After the duration, navigate onward (replace so back button won't return here)
    Timer(widget.duration, () {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 500),
          pageBuilder: (_, __, ___) => widget.next(),
          transitionsBuilder: (_, anim, __, child) =>
              FadeTransition(opacity: anim, child: child),
        ),
      );
    });
  }

  @override
  void dispose() {
    _logoCtrl.dispose();
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final teal = KadeColors.teal;
    final tealDark = KadeColors.tealDark;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [teal, tealDark, const Color(0xFF063A34)],
          ),
        ),
        child: Stack(
          children: [
            // soft decorative circles
            Positioned(top: -60, left: -40, child: _circle(160, Colors.white.withOpacity(0.06))),
            Positioned(bottom: -50, right: -30, child: _circle(200, Colors.white.withOpacity(0.05))),

            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Animated logo (fade + scale + gentle pulse)
                  FadeTransition(
                    opacity: _fade,
                    child: ScaleTransition(
                      scale: _scale,
                      child: AnimatedBuilder(
                        animation: _pulseCtrl,
                        builder: (context, child) {
                          final s = 1.0 + (_pulseCtrl.value * 0.04); // 1.00 → 1.04
                          return Transform.scale(scale: s, child: child);
                        },
                        child: _logoBadge(),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // App name
                  FadeTransition(
                    opacity: _fade,
                    child: const Text(
                      "Lanka-Link",
                      style: TextStyle(
                        fontSize: 30, fontWeight: FontWeight.w900,
                        color: Colors.white, fontFamily: "Nunito", letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  FadeTransition(
                    opacity: _fade,
                    child: Text(
                      "Smart Merchant Platform",
                      style: TextStyle(
                        fontSize: 13, color: Colors.white.withOpacity(0.85),
                        fontWeight: FontWeight.w500, letterSpacing: 0.3,
                      ),
                    ),
                  ),
                  const SizedBox(height: 44),

                  // Loading spinner
                  SizedBox(
                    width: 30, height: 30,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.6,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white.withOpacity(0.9)),
                    ),
                  ),
                ],
              ),
            ),

            // Footer
            Positioned(
              left: 0, right: 0, bottom: 28,
              child: FadeTransition(
                opacity: _fade,
                child: Text(
                  "© 2026 Lanka-Link",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.6)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _circle(double size, Color color) =>
      Container(width: size, height: size,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle));

  // Logo badge — uses the asset if present, else a leaf emoji fallback.
  Widget _logoBadge() {
    return Container(
      width: 120, height: 120,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 24, offset: const Offset(0, 10)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(30),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Image.asset(
            "assets/images/app_icon.png",
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => const Center(
              child: Text("assets/images/app_icon.png", style: TextStyle(fontSize: 56)),
            ),
          ),
        ),
      ),
    );
  }
}