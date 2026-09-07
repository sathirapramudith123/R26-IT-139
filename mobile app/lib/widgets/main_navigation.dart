import 'package:flutter/material.dart';
import '../core/theme.dart';

// Adjust these imports/class names to match your actual screens.
import '../screens/dashboard_screen.dart';
import '../screens/predictions/predictions_hub_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/profile_screen.dart';

// Module screens (shown inside the Menu grid, not on the bar).
import '../screens/agency_banking/agency_banking_form_screen.dart';
import '../screens/inventory/inventory_form_screen.dart';
import '../screens/procurement/procurement_form_screen.dart';
import '../screens/suppliers/supplier_form_screen.dart';
import '../screens/transactions/transaction_form_screen.dart';
import '../screens/reports/income_statement_screen.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

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
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) =>
            setState(() => _currentIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights),
            label: 'Predictions',
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view),
            label: 'Menu',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
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
      _MenuItem(
        'Agency Banking',
        Icons.account_balance_outlined,
        () => const AgencyBankingFormScreen(),
      ),
      _MenuItem(
        'Inventory',
        Icons.inventory_2_outlined,
        () => const InventoryFormScreen(),
      ),
      _MenuItem(
        'Procurement',
        Icons.shopping_cart_outlined,
        () => const ProcurementFormScreen(),
      ),
      _MenuItem(
        'Suppliers',
        Icons.handshake_outlined,
        () => const SupplierFormScreen(),
      ),
      _MenuItem(
        'Transactions',
        Icons.receipt_long_outlined,
        () => const TransactionFormScreen(),
      ),
      _MenuItem(
        'Reports',
        Icons.bar_chart_outlined,
        () => const IncomeStatementScreen(),
      ),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Menu')),
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
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => item.builder()),
              ),
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
                    Text(
                      item.label,
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
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