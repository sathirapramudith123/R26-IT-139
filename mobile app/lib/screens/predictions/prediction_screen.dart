import 'package:flutter/material.dart';
import '../../config/predictions.dart';
import '../../services/prediction_service.dart';

class PredictionScreen extends StatefulWidget {
  final PredictionModel model;
  const PredictionScreen({super.key, required this.model});
  @override
  State<PredictionScreen> createState() => _PredictionScreenState();
}

class _PredictionScreenState extends State<PredictionScreen> {
  bool loading = false;
  String? error;
  Map<String, dynamic>? result;

  Future<void> _predict() async {
    setState(() { loading = true; error = null; result = null; });
    try {
      result = await PredictionService.predict(widget.model.component, widget.model.sampleFeatures);
      setState(() {});
    } catch (e) {
      setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.model.title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text("Runs the model with sample merchant data.", style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: loading ? null : _predict,
            child: Padding(padding: const EdgeInsets.all(12), child: Text(loading ? "Predicting..." : "Run Prediction")),
          ),
          const SizedBox(height: 20),
          if (error != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Text(error!, style: TextStyle(color: Colors.red.shade700)),
            ),
          if (result != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text("Result", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Text("Prediction: ${result!["prediction"]}", style: const TextStyle(fontSize: 16)),
                  if (result!["score"] != null) ...[
                    const SizedBox(height: 8),
                    _scoreBar((result!["score"] as num).toDouble()),
                  ],
                ]),
              ),
            ),
        ],
      ),
    );
  }

  Widget _scoreBar(double score) {
    final pct = (score.clamp(0, 100)) / 100;
    final color = score >= 70 ? Colors.green : score >= 40 ? Colors.orange : Colors.red;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text("Score: ${score.toStringAsFixed(1)} / 100", style: const TextStyle(fontSize: 16)),
      const SizedBox(height: 6),
      ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: LinearProgressIndicator(value: pct, minHeight: 10, color: color, backgroundColor: Colors.grey.shade200),
      ),
    ]);
  }
}