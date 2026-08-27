import 'package:flutter/material.dart';

// Adjust these imports/class names to match your actual screens.
import '../screens/dashboard_screen.dart';
import '../screens/predictions/predictions_hub_screen.dart';
import '../screens/notifications_screen.dart';

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
    NotificationsScreen(),
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
            // Wrap in a Badge and wire the count to notification_service.dart.
            // Hide the badge when the count is zero.
            icon: Badge(
              label: Text('3'),
              child: Icon(Icons.notifications_outlined),
            ),
            selectedIcon: Icon(Icons.notifications),
            label: 'Alerts',
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
        Icons.account_balance,
        () => const AgencyBankingFormScreen(),
      ),
      _MenuItem(
        'Inventory',
        Icons.inventory_2,
        () => const InventoryFormScreen(),
      ),
      _MenuItem(
        'Procurement',
        Icons.shopping_cart,
        () => const ProcurementFormScreen(),
      ),
      _MenuItem(
        'Suppliers',
        Icons.local_shipping,
        () => const SupplierFormScreen(),
      ),
      _MenuItem(
        'Transactions',
        Icons.receipt_long,
        () => const TransactionFormScreen(),
      ),
      _MenuItem(
        'Reports',
        Icons.bar_chart,
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
        children: items.map((item) {
          return Card(
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => item.builder()),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(item.icon, size: 40),
                  const SizedBox(height: 12),
                  Text(
                    item.label,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ],
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