import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../config/predictions.dart';
import '../../services/prediction_service.dart';
import '../predictions/prediction_widgets.dart';

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
    setState(() {
      loading = true;
      error = null;
      result = null;
    });
    try {
      result = await PredictionService.predict(
          widget.model.component, widget.model.sampleFeatures);
      setState(() {});
    } catch (e) {
      setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final teal = isDark ? KadeColors.tealDark : KadeColors.teal;
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    return Scaffold(
      appBar: AppBar(title: Text(widget.model.title)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [teal, const Color(0xFF094F45)]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(children: [
              Text(widget.model.icon, style: const TextStyle(fontSize: 34)),
              const SizedBox(width: 14),
              Expanded(
                child: Text(widget.model.title,
                    style: const TextStyle(
                        color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          Text("Tap below to see a prediction using sample business data.",
              style: TextStyle(color: sub)),
          const SizedBox(height: 16),
          SizedBox(
            height: 52,
            child: FilledButton(
              style: FilledButton.styleFrom(
                  backgroundColor: teal,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999))),
              onPressed: loading ? null : _predict,
              child: loading
                  ? const SizedBox(
                      height: 22, width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : const Text("Show Prediction",
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
            ),
          ),
          const SizedBox(height: 20),
          if (error != null)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                  color: KadeColors.terra.withOpacity(0.12), borderRadius: BorderRadius.circular(16)),
              child: Row(children: [
                const Icon(Icons.error_outline, color: KadeColors.terra, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text(error!, style: const TextStyle(color: KadeColors.terra, fontSize: 13))),
              ]),
            ),
          if (result != null) _resultCard(isDark, teal),
        ],
      ),
    );
  }

  Widget _resultCard(bool isDark, Color teal) {
    final prediction = result!["prediction"];
    final score = result!["score"];
    final hasScore = score is num;
    final sub = Theme.of(context).textTheme.bodySmall?.color;
    final explanation = (result!["explanation"] is List) ? result!["explanation"] as List : const [];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? KadeColors.borderDark : KadeColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("What we found",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, fontFamily: "Nunito")),
          const SizedBox(height: 16),
          if (!hasScore) ...[
            // Regression-style result: a predicted number.
            Text("Predicted number", style: TextStyle(color: sub, fontSize: 13)),
            const SizedBox(height: 4),
            Text((prediction as num).toStringAsFixed(1),
                style: TextStyle(
                    fontSize: 34, fontWeight: FontWeight.w800, fontFamily: "Nunito", color: teal)),
          ] else ...[
            // Classification-style result: yes/no plus a confidence ring.
            Row(children: [
              RingGauge(score: (score).toDouble()),
              const SizedBox(width: 16),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text("Recommendation", style: TextStyle(color: sub, fontSize: 13)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: (prediction == 1 ? KadeColors.teal : KadeColors.terra).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(prediction == 1 ? "Yes" : "No",
                        style: TextStyle(
                            color: prediction == 1 ? teal : KadeColors.terra,
                            fontWeight: FontWeight.w800, fontSize: 15)),
                  ),
                  const SizedBox(height: 6),
                  Text("How confident we are", style: TextStyle(fontSize: 11, color: sub)),
                ]),
              ),
            ]),
          ],
          InfluenceBars(explanation: explanation),
        ],
      ),
    );
  }
}