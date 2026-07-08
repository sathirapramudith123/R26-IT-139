import 'package:flutter/material.dart';
import '../config/modules.dart';
import '../core/theme.dart';                    
import '../services/auth_service.dart';
import 'auth/login_screen.dart';
import 'crud/list_screen.dart';
import 'predictions/predictions_hub_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Dashboard"),
        actions: [
          // theme toggle — rebuilds its icon when the mode changes
          ValueListenableBuilder<ThemeMode>(
            valueListenable: ThemeController.mode,
            builder: (context, mode, _) => IconButton(
              icon: Icon(mode == ThemeMode.dark ? Icons.light_mode : Icons.dark_mode),
              tooltip: "Toggle theme",
              onPressed: () => ThemeController.toggle(),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              AuthService.logout();
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
            },
          ),
        ],
      ),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(16),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        children: [
          ...modules.map((m) => _tile(context, m.icon, m.title,
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => ListScreen(module: m))))),
          _tile(context, "🤖", "Predictions",
              () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PredictionsHubScreen()))),
        ],
      ),
    );
  }

  Widget _tile(BuildContext context, String icon, String title, VoidCallback onTap) => Card(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(icon, style: const TextStyle(fontSize: 40)),
            const SizedBox(height: 8),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600), textAlign: TextAlign.center),
          ]),
        ),
      );
}