import 'package:flutter/material.dart';
import '../config/modules.dart';
import '../core/theme.dart';
import '../core/api.dart';
import '../services/auth_service.dart';
import 'auth/login_screen.dart';
import 'crud/list_screen.dart';
import 'predictions/predictions_hub_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool loading = true;
  double income = 0, expense = 0;
  int lowStock = 0;

  @override
  void initState() { super.initState(); _loadMetrics(); }

  Future<void> _loadMetrics() async {
    setState(() => loading = true);
    try {
      final txns = await Api.get("/transactions");
      final inv = await Api.get("/inventory");

      double inc = 0, exp = 0;
      if (txns is List) {
        for (final t in txns) {
          final amt = (t["amount"] is num) ? (t["amount"] as num).toDouble() : 0.0;
          final type = "${t["transaction_type"]}";
          if (type == "sale" || type == "deposit") inc += amt;
          if (type == "purchase" || type == "expense") exp += amt;
        }
      }

      int low = 0;
      if (inv is List) {
        for (final i in inv) {
          final q = (i["quantity"] is num) ? (i["quantity"] as num) : 0;
          final r = (i["reorder_level"] is num) ? (i["reorder_level"] as num) : 0;
          if (q <= r) low++;
        }
      }

      if (mounted) setState(() { income = inc; expense = exp; lowStock = low; });
    } catch (_) {
      // leave metrics at 0 on error
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  String _money(double v) {
    return "LKR ${v.toStringAsFixed(0)}";
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final teal = isDark ? KadeColors.tealDark : KadeColors.teal;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadMetrics,
          child: CustomScrollView(
            slivers: [
              // ---- Warm header ----
              SliverToBoxAdapter(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                      colors: [teal, const Color(0xFF094F45)],
                    ),
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(36), bottomRight: Radius.circular(36),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Container(
                          height: 44, width: 44,
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(14)),
                          child: const Center(child: Text("🌿", style: TextStyle(fontSize: 22))),
                        ),
                        const SizedBox(width: 10),
                        const Text("Kade", style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
                        const Spacer(),
                        ValueListenableBuilder<ThemeMode>(
                          valueListenable: ThemeController.mode,
                          builder: (context, mode, _) => IconButton(
                            icon: Icon(mode == ThemeMode.dark ? Icons.light_mode : Icons.dark_mode, color: Colors.white),
                            onPressed: () => ThemeController.toggle(),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.logout, color: Colors.white),
                          onPressed: () {
                            AuthService.logout();
                            Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                          },
                        ),
                      ]),
                      const SizedBox(height: 18),
                      const Text("Ayubowan 👋", style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
                      const SizedBox(height: 4),
                      Text("Here's your kade today.", style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 14)),
                    ],
                  ),
                ),
              ),

              // ---- Metric cards ----
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.55,
                  ),
                  delegate: SliverChildListDelegate([
                    _metricCard(
                      label: "Total Income",
                      value: loading ? "…" : _money(income),
                      gradient: const [Color(0xFF0D7566), Color(0xFF0891A5)],   // teal
                    ),
                    _metricCard(
                      label: "Total Expense",
                      value: loading ? "…" : _money(expense),
                      gradient: const [Color(0xFFF59E0B), Color(0xFFEF4444)],   // orange → red
                    ),
                    _metricCard(
                      label: "Net Profit",
                      value: loading ? "…" : _money(income - expense),
                      gradient: const [Color(0xFF059669), Color(0xFF0D7566)],   // green
                    ),
                    _metricCard(
                      label: "Low Stock Items",
                      value: loading ? "…" : "$lowStock",
                      gradient: const [Color(0xFF1E3A5F), Color(0xFF1E40AF)],   // navy
                    ),
                  ]),
                ),
              ),

              // ---- Section label ----
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(24, 12, 24, 4),
                  child: Text("Modules", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
                ),
              ),

              // ---- Module grid ----
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2, mainAxisSpacing: 14, crossAxisSpacing: 14, childAspectRatio: 1.15,
                  ),
                  delegate: SliverChildListDelegate([
                    ...modules.map((m) => _Tile(
                          icon: m.icon, title: m.title, isDark: isDark, teal: teal,
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ListScreen(module: m))),
                        )),
                    _Tile(
                      icon: "🤖", title: "Predictions", isDark: isDark, teal: teal, highlight: true,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PredictionsHubScreen())),
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _metricCard({
    required String label,
    required String value,
    required List<Color> gradient,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: gradient,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: gradient.first.withOpacity(0.35),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: Colors.white.withOpacity(0.9),
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              fontFamily: "Nunito",
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final String icon, title;
  final VoidCallback onTap;
  final bool isDark, highlight;
  final Color teal;
  const _Tile({required this.icon, required this.title, required this.onTap, required this.isDark, required this.teal, this.highlight = false});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: highlight ? teal.withOpacity(isDark ? 0.22 : 0.10) : Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: isDark ? KadeColors.borderDark : KadeColors.borderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 44, width: 44,
                decoration: BoxDecoration(
                  color: highlight ? teal.withOpacity(0.18) : (isDark ? Colors.white10 : const Color(0xFFF3ECE0)),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(child: Text(icon, style: const TextStyle(fontSize: 22))),
              ),
              const Spacer(),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, fontFamily: "Nunito")),
            ],
          ),
        ),
      ),
    );
  }
}