import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../config/predictions.dart';
import 'prediction_screen.dart';

class PredictionsHubScreen extends StatelessWidget {
  const PredictionsHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final teal = isDark ? KadeColors.tealDark : KadeColors.teal;

    return Scaffold(
      appBar: AppBar(title: const Text("Smart Predictions")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 8, left: 4),
            child: Text("Four explainable ML models",
                style: TextStyle(color: Theme.of(context).textTheme.bodySmall?.color)),
          ),
          ...predictionModels.map((m) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardTheme.color,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isDark ? KadeColors.borderDark : KadeColors.borderLight),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                  leading: Container(
                    height: 48, width: 48,
                    decoration: BoxDecoration(color: teal.withOpacity(0.12), borderRadius: BorderRadius.circular(14)),
                    child: Center(child: Text(m.icon, style: const TextStyle(fontSize: 24))),
                  ),
                  title: Text(m.title, style: const TextStyle(fontWeight: FontWeight.w800, fontFamily: "Nunito")),
                  trailing: Icon(Icons.chevron_right, color: teal),
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PredictionScreen(model: m))),
                ),
              )),
        ],
      ),
    );
  }
}