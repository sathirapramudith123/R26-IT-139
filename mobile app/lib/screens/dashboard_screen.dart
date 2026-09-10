import 'package:flutter/material.dart';
import '../config/modules.dart';
import '../core/theme.dart';
import '../core/api.dart';
import '../services/auth_service.dart';
import '../widgets/module_tile.dart';
import 'auth/login_screen.dart';
import 'crud/list_screen.dart';
import 'notifications_screen.dart';
import 'predictions/predictions_hub_screen.dart';
import 'reports/income_statement_screen.dart';


class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool loading = true;
  double income = 0, expense = 0;
  int lowStock = 0;
  int unread = 0;

  @override
  void initState() {
    super.initState();
    _loadMetrics();
  }

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

      // unread notification count for the bell badge
      int un = 0;
      try {
        final n = await Api.get("/notifications/unread-count");
        if (n is Map && n["count"] is num) un = (n["count"] as num).toInt();
      } catch (_) {}

      if (mounted) setState(() { income = inc; expense = exp; lowStock = low; unread = un; });
    } catch (_) {
      // leave metrics at 0 on error
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _openIncomeStatement() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const IncomeStatementScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadMetrics,
          child: CustomScrollView(
            slivers: [
              // ---- Header (simple gradient) ----
              SliverToBoxAdapter(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 34),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                      colors: [Color(0xFF0D9488), Color(0xFF0F766E), Color(0xFF065F46)],
                    ),
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(28), bottomRight: Radius.circular(28)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Container(
                          height: 44, width: 44,
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.14), borderRadius: BorderRadius.circular(12)),
                          child: const Center(child: Icon(Icons.storefront_outlined, color: Colors.white, size: 24)),
                        ),
                        const SizedBox(width: 10),
                        Text("Lanka-Link", style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
                        const Spacer(),

                        // ---- Notification bell with unread badge ----
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.notifications_outlined, color: Colors.white),
                              tooltip: "Notifications",
                              onPressed: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                                );
                                _loadMetrics(); // refresh the badge when coming back
                              },
                            ),
                            if (unread > 0)
                              Positioned(
                                right: 6,
                                top: 6,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                  constraints: const BoxConstraints(minWidth: 18),
                                  decoration: BoxDecoration(
                                    color: KadeColors.terra,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    unread > 9 ? "9+" : "$unread",
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),

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
                      Text("Ayubowan 👋",
                          style: Theme.of(context).textTheme.headlineLarge?.copyWith(color: Colors.white)),
                      const SizedBox(height: 4),
                      Text("Here's your Lanka-Link today.", style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 14)),
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
                    _AnimatedStatCard(
                      label: "Total Income",
                      value: income,
                      loading: loading,
                      gradient: const [Color(0xFF14335E), Color(0xFF1E4785)],
                    ),
                    _AnimatedStatCard(
                      label: "Total Expense",
                      value: expense,
                      loading: loading,
                      gradient: const [Color(0xFF8A2E2E), Color(0xFF5C1E1E)],
                    ),
                    _AnimatedStatCard(
                      label: "Net Profit",
                      value: income - expense,
                      loading: loading,
                      gradient: const [Color(0xFF1E7A46), Color(0xFF14522F)],
                      onTap: _openIncomeStatement,
                    ),
                    _AnimatedStatCard(
                      label: "Low Stock Items",
                      value: lowStock.toDouble(),
                      loading: loading,
                      isCount: true,
                      gradient: const [Color(0xFF37415A), Color(0xFF232B3D)],
                    ),
                  ]),
                ),
              ),

              // ---- Section label ----
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 4),
                  child: Text("Modules", style: Theme.of(context).textTheme.titleMedium),
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
                    ...modules.map((m) => ModuleTile(
                          icon: m.icon, title: m.title,
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ListScreen(module: m))),
                        )),
                    ModuleTile(
                      icon: Icons.bar_chart_outlined, title: "Financial Statement",
                      onTap: _openIncomeStatement,
                    ),
                    ModuleTile(
                      icon: Icons.insights_outlined, title: "Predictions", highlight: true,
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
}
/// Gradient stat card whose number counts up from 0 to [value] on load.
class _AnimatedStatCard extends StatelessWidget {
  final String label;
  final double value;
  final bool loading;
  final bool isCount;      // integer count (no LKR prefix)
  final List<Color> gradient;
  final VoidCallback? onTap;

  const _AnimatedStatCard({
    required this.label,
    required this.value,
    required this.loading,
    required this.gradient,
    this.isCount = false,
    this.onTap,
  });

  String _fmt(double v) {
    if (isCount) return v.round().toString();
    final n = v.round();
    final s = n.toString().replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
    return "LKR $s";
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight, colors: gradient),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(color: gradient.first.withOpacity(0.35), blurRadius: 16, offset: const Offset(0, 8)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label,
                maxLines: 1, overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.9), fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            loading
                ? const Text("…", style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white))
                : TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: value),
                    duration: const Duration(milliseconds: 1200),
                    curve: Curves.easeOutCubic,
                    builder: (context, v, _) => FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(_fmt(v),
                          maxLines: 1,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white, fontFamily: "Nunito")),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}