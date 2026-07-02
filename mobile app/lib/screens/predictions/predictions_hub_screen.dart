import 'package:flutter/material.dart';
import '../../config/predictions.dart';
import 'prediction_screen.dart';

class PredictionsHubScreen extends StatelessWidget {
  const PredictionsHubScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Smart Predictions")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: predictionModels.map((m) => Card(
              child: ListTile(
                leading: Text(m.icon, style: const TextStyle(fontSize: 28)),
                title: Text(m.title),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => PredictionScreen(model: m))),
              ),
            )).toList(),
      ),
    );
  }
}