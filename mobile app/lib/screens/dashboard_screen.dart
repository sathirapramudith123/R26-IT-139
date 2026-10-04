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
import 'reports/reports_screen.dart';
import 'agency_banking/my_banks_screen.dart';
import 'journal/journal_screen.dart';
import '../core/i18n.dart';

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
  List<Map<String, dynamic>> recent = []; // latest 5 transactions

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

      // newest first, same as the web "Recent activity"
      final latest = (txns is List)
          ? txns.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList()
          : <Map<String, dynamic>>[];
      latest.sort((a, b) => "${b["created_at"] ?? ""}".compareTo("${a["created_at"] ?? ""}"));

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

      if (mounted) {
        setState(() {
          income = inc;
          expense = exp;
          lowStock = low;
          unread = un;
          recent = latest.take(5).toList();
        });
      }
    } catch (_) {
      // leave metrics at 0 on error
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _openIncomeStatement() {
    Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportViewScreen(reportId: "income")));
  }

  // logo, notification bell, theme and logout — white on the blue header
  Widget _topBar(BuildContext context) {
    return Row(
      children: [
        Container(
          height: 40,
          width: 40,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.18),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.storefront_outlined, color: Colors.white, size: 22),
        ),
        const SizedBox(width: 10),
        Text(tr("Lanka-Link"), style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
        const Spacer(),
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              icon: const Icon(Icons.notifications_outlined, color: Colors.white),
              tooltip: tr("Notifications"),
              onPressed: () async {
                await Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
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
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
                  child: Text(
                    unread > 9 ? "9+" : "$unread",
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: KadeColors.teal, fontSize: 10, fontWeight: FontWeight.w800),
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
          onPressed: () async {
            await AuthService.logout();
            if (!context.mounted) return;
            Navigator.pushAndRemoveUntil(
              context,
              MaterialPageRoute(builder: (_) => const LoginScreen()),
              (route) => false,
            );
          },
        ),
      ],
    );
  }

  // "Net Profit" headline figure — tap for the income statement
  Widget _netProfit(BuildContext context) {
    final white70 = Colors.white.withValues(alpha: 0.8);
    return GestureDetector(
      onTap: _openIncomeStatement,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(tr("Ayubowan 👋"), style: TextStyle(color: white70, fontSize: 14)),
          const SizedBox(height: 10),
          Text(
            tr("Net Profit"),
            style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 4),
          loading
              ? const Text("…", style: TextStyle(color: Colors.white, fontSize: 30))
              : _CountUp(
                  value: income - expense,
                  style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w600),
                ),
          const SizedBox(height: 4),
          Text(tr("Income minus expenses · tap for the statement"), style: TextStyle(color: white70, fontSize: 11)),
        ],
      ),
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
              // ---- Header: blue gradient with net profit, white stat cards overlapping its edge ----
              SliverToBoxAdapter(
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Column(
                      children: [
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.fromLTRB(20, 12, 12, 84),
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: KadeColors.headerGradient,
                            ),
                            borderRadius: BorderRadius.only(
                              bottomLeft: Radius.circular(32),
                              bottomRight: Radius.circular(32),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _topBar(context),
                              const SizedBox(height: 18),
                              _netProfit(context),
                            ],
                          ),
                        ),
                        const SizedBox(height: 70),
                      ],
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: 136,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        children: [
                          _StatCard(
                            icon: Icons.south_west,
                            color: KadeColors.success,
                            label: tr("Total Income"),
                            caption: tr("money in"),
                            value: income,
                            loading: loading,
                          ),
                          _StatCard(
                            icon: Icons.north_east,
                            color: KadeColors.terra,
                            label: tr("Total Expense"),
                            caption: tr("money out"),
                            value: expense,
                            loading: loading,
                          ),
                          _StatCard(
                            icon: Icons.inventory_2_outlined,
                            color: KadeColors.amber,
                            label: tr("Low Stock Items"),
                            caption: tr("to restock"),
                            value: lowStock.toDouble(),
                            loading: loading,
                            isCount: true,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // ---- Section label ----
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 4),
                  child: Text(
                    tr("Modules"),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
              ),

              // ---- Module grid ----
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: 1.15,
                  ),
                  delegate: SliverChildListDelegate([
                    ...modules.map(
                      (m) => ModuleTile(
                        icon: m.icon,
                        title: m.title,
                        subtitle: _moduleCaptions[m.path],
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ListScreen(module: m))),
                      ),
                    ),
                    ModuleTile(
                      icon: Icons.account_balance_wallet_outlined,
                      title: tr("My Banks"),
                      subtitle: "Float accounts",
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MyBanksScreen())),
                    ),
                    ModuleTile(
                      icon: Icons.menu_book_outlined,
                      title: tr("Journal"),
                      subtitle: "Double-entry ledger",
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const JournalScreen())),
                    ),
                    ModuleTile(
                      icon: Icons.bar_chart_outlined,
                      title: tr("Financial Statement"),
                      subtitle: "Income statement",
                      onTap: _openIncomeStatement,
                    ),
                    ModuleTile(
                      icon: Icons.insights_outlined,
                      title: tr("Predictions"),
                      subtitle: "AI insights",
                      highlight: true,
                      onTap: () =>
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const PredictionsHubScreen())),
                    ),
                  ]),
                ),
              ),

              // ---- Recent activity (latest 5 transactions) ----
              SliverToBoxAdapter(child: _recentActivity(context)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _recentActivity(BuildContext context) {
    final soft = Theme.of(context).textTheme.bodySmall?.color;
    final txModule = modules.firstWhere((m) => m.path == "/transactions");
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              tr("Recent activity"),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          Card(
            margin: EdgeInsets.zero,
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                if (recent.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(tr("No transactions yet."), style: TextStyle(color: soft)),
                  )
                else
                  for (var i = 0; i < recent.length; i++) ...[
                    if (i > 0) const Divider(height: 1),
                    _activityRow(recent[i], soft),
                  ],
                const Divider(height: 1),
                InkWell(
                  onTap: () async {
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => ListScreen(module: txModule)));
                    _loadMetrics();
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Center(
                      child: Text(
                        tr("View all transactions →"),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).brightness == Brightness.dark
                              ? KadeColors.tealDark
                              : KadeColors.teal,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _activityRow(Map<String, dynamic> tx, Color? soft) {
    final type = "${tx["transaction_type"] ?? ""}";
    final isIn = type == "sale" || type == "deposit";
    final color = isIn ? KadeColors.success : KadeColors.terra;
    final amount = (tx["amount"] is num) ? (tx["amount"] as num).toDouble() : double.tryParse("${tx["amount"]}") ?? 0;
    final d = DateTime.tryParse("${tx["created_at"] ?? ""}")?.toLocal();
    final when = d == null ? "" : "${d.year}-${d.month.toString().padLeft(2, "0")}-${d.day.toString().padLeft(2, "0")}";
    String title(String s) =>
        s.split("_").map((w) => w.isEmpty ? w : "${w[0].toUpperCase()}${w.substring(1)}").join(" ");
    final cat = "${tx["category"] ?? ""}".trim();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: color.withValues(alpha: 0.12),
            child: Icon(isIn ? Icons.south_west : Icons.north_east, size: 16, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tr(title(type)), style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(
                  "${cat.isNotEmpty ? cat : tr(title("${tx["payment_method"] ?? ""}"))} · $when",
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, color: soft),
                ),
              ],
            ),
          ),
          Text(
            "${isIn ? "+" : "-"} ${_fmtMoney(amount)}",
            style: TextStyle(fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }
}

// small caption under each module tile (same as the web module cards)
const _moduleCaptions = {
  "/transactions": "Sales, purchases & expenses",
  "/inventory": "Stock & batches",
  "/procurement": "Purchase orders",
  "/suppliers": "Your vendors",
  "/agency-banking": "Deposits & withdrawals",
};

String _fmtMoney(double v, {bool isCount = false}) {
  if (isCount) return v.round().toString();
  final s = v.round().abs().toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
  return "${v < 0 ? "-" : ""}LKR $s";
}

/// Number that counts up from 0 to [value] on load.
class _CountUp extends StatelessWidget {
  final double value;
  final bool isCount;
  final TextStyle style;

  const _CountUp({required this.value, required this.style, this.isCount = false});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value),
      duration: const Duration(milliseconds: 1200),
      curve: Curves.easeOutCubic,
      builder: (context, v, _) => FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Text(_fmtMoney(v, isCount: isCount), maxLines: 1, style: style),
      ),
    );
  }
}

/// White card with a coloured icon, a label and a counting-up number.
class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String caption;
  final double value;
  final bool loading;
  final bool isCount;

  const _StatCard({
    required this.icon,
    required this.color,
    required this.label,
    required this.caption,
    required this.value,
    required this.loading,
    this.isCount = false,
  });

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Container(
      width: 168,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(KadeRadius.lg),
        boxShadow: const [BoxShadow(color: KadeColors.cardShadow, blurRadius: 18, offset: Offset(0, 8))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 13,
                backgroundColor: color.withValues(alpha: 0.15),
                child: Icon(icon, size: 15, color: color),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: text.titleSmall),
              ),
            ],
          ),
          const Spacer(),
          loading
              ? Text("…", style: text.titleLarge)
              : _CountUp(
                  value: value,
                  isCount: isCount,
                  style: text.titleLarge!.copyWith(fontWeight: FontWeight.w600),
                ),
          const SizedBox(height: 2),
          Text(caption, style: text.labelMedium?.copyWith(color: color)),
        ],
      ),
    );
  }
}
