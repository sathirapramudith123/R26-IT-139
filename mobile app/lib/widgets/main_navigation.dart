import 'package:flutter/material.dart';
import '../core/theme.dart';

// Adjust these imports/class names to match your actual screens.
import '../screens/dashboard_screen.dart';
import '../screens/predictions/predictions_hub_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/profile_screen.dart';

// Module screens (shown inside the Menu grid, not on the bar).
import '../screens/agency_banking/agency_banking_form_screen.dart';
import '../screens/agency_banking/my_banks_screen.dart';
import '../screens/inventory/inventory_form_screen.dart';
import '../screens/procurement/procurement_form_screen.dart';
import '../screens/suppliers/supplier_form_screen.dart';
import '../screens/transactions/transaction_form_screen.dart';
import '../screens/reports/reports_screen.dart';
import '../core/i18n.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key, this.initialIndex = 0});

  /// Tab to open first (Settings reopens itself after a language change).
  final int initialIndex;

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  late int _currentIndex = widget.initialIndex;

  // IndexedStack keeps each tab's state alive when switching.
  late final List<Widget> _screens = const [
    DashboardScreen(),
    PredictionsHubScreen(),
    MenuScreen(),
    SettingsScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        destinations: [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: tr('Dashboard'),
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights),
            label: tr('Predictions'),
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view),
            label: tr('Menu'),
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: tr('Settings'),
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: tr('Profile'),
          ),
        ],
      ),
    );
  }
}

/// A simple grid hub for the modules that don't live on the bottom bar.
/// You can later drive this list off config/modules.dart instead of hardcoding.
class MenuScreen extends StatelessWidget {
  const MenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = <_MenuItem>[
      _MenuItem(tr('Agency Banking'), Icons.account_balance_outlined, () => const AgencyBankingFormScreen()),
      _MenuItem(tr('My Banks'), Icons.account_balance_wallet_outlined, () => const MyBanksScreen()),
      _MenuItem(tr('Inventory'), Icons.inventory_2_outlined, () => const InventoryFormScreen()),
      _MenuItem(tr('Procurement'), Icons.shopping_cart_outlined, () => const ProcurementFormScreen()),
      _MenuItem(tr('Suppliers'), Icons.handshake_outlined, () => const SupplierFormScreen()),
      _MenuItem(tr('Transactions'), Icons.receipt_long_outlined, () => const TransactionFormScreen()),
      _MenuItem(tr('Reports'), Icons.bar_chart_outlined, () => const ReportsScreen()),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(tr('Menu'))),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(16),
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 1.15,
        children: items.map((item) {
          final isDark = Theme.of(context).brightness == Brightness.dark;
          final teal = isDark ? KadeColors.tealDark : KadeColors.teal;

          return Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => item.builder())),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardTheme.color,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? KadeColors.borderDark : KadeColors.borderLight),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 40,
                      width: 40,
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white10 : KadeColors.surfaceMutedLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(item.icon, size: 20, color: teal),
                    ),
                    const Spacer(),
                    Text(tr(item.label), style: Theme.of(context).textTheme.titleSmall),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _MenuItem {
  final String label;
  final IconData icon;
  final Widget Function() builder;

  _MenuItem(this.label, this.icon, this.builder);
}
