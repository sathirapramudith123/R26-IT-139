import 'package:flutter/material.dart';
import '../config/modules.dart';
import '../core/theme.dart';
import '../core/api.dart';
import '../services/auth_service.dart';
import '../widgets/gradient_stat_card.dart';
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

  String _money(double v) {
    return "LKR ${v.toStringAsFixed(0)}";
  }

  void _openIncomeStatement() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const IncomeStatementScreen()),
    );
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
              // ---- Header ----
              SliverToBoxAdapter(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                      colors: [teal, const Color(0xFF081B3A)],
                    ),
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(28), bottomRight: Radius.circular(28),
                    ),
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
                      Text("Ayubowan 👋", style: Theme.of(context).textTheme.headlineLarge?.copyWith(color: Colors.white)),
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
                    GradientStatCard(
                      label: "Total Income",
                      value: loading ? "…" : _money(income),
                      gradient: const [Color(0xFF14335E), Color(0xFF1E4785)],
                    ),
                    GradientStatCard(
                      label: "Total Expense",
                      value: loading ? "…" : _money(expense),
                      gradient: const [Color(0xFF8A2E2E), Color(0xFF5C1E1E)],
                    ),
                    GradientStatCard(
                      label: "Net Profit",
                      value: loading ? "…" : _money(income - expense),
                      gradient: const [Color(0xFF1E7A46), Color(0xFF14522F)],
                      onTap: _openIncomeStatement,
                    ),
                    GradientStatCard(
                      label: "Low Stock Items",
                      value: loading ? "…" : "$lowStock",
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