import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/api.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import 'prediction_widgets.dart';
import 'try_helpers.dart';

/// "Try it yourself": enter the inputs of the weekly demand model and see its forecast.
/// Same fields and defaults as the web page (frontend/src/app/dashboard/predictions/demand).
class DemandTryScreen extends StatefulWidget {
  const DemandTryScreen({super.key});

  @override
  State<DemandTryScreen> createState() => _DemandTryScreenState();
}

class _Field {
  final String name, label;
  final String? hint;
  final bool number;
  final TextEditingController ctrl;
  _Field(this.name, this.label, Object value, {this.hint, this.number = true})
    : ctrl = TextEditingController(text: "$value");
}

class _DemandTryScreenState extends State<DemandTryScreen> {
  late final List<_Field> fields;
  bool loading = false;
  String? error;
  Map? result;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final iso = isoWeekOf(now);
    final days = daysToAvurudu(now);
    // Defaults: today's week and Avurudu countdown, and a typical week of White Sugar from the
    // training data. Change one value at a time to see its effect.
    fields = [
      _Field(
        "item",
        "Item",
        "White Sugar",
        number: false,
        hint: "e.g. White Sugar, Nadu Rice, Red Dhal, Big Onion, Eggs (White)",
      ),
      _Field(
        "category",
        "Category",
        "Grocery/Staple",
        number: false,
        hint: "Grocery/Staple or Vegetable/Fruit",
      ),
      _Field("iso_year", "ISO Year", iso.year),
      _Field("iso_week", "ISO Week", iso.week),
      _Field("days_to_avurudu", "Days to Avurudu", days, hint: "Try 6 to see the festival effect"),
      _Field(
        "festival_season",
        "Festival Season (0/1)",
        days <= 21 ? 1 : 0,
        hint: "1 when Avurudu is 21 days away or less",
      ),
      _Field("avg_wholesale_price_rs", "Avg Wholesale Price", 196),
      _Field("avg_retail_price_rs", "Avg Retail Price", 235),
      _Field("lag1_units", "Lag 1 Units", 70, hint: "Units sold last week"),
      _Field("lag4_units", "Lag 4 Units", 68, hint: "Units sold 4 weeks ago"),
      _Field("rolling4_mean_units", "Rolling 4-wk Mean Units", 69, hint: "Average of the past 4 weeks"),
      _Field("weekend_share", "Weekend Share", 0.29, hint: "Constant 0.29 in the training data"),
    ];
  }

  @override
  void dispose() {
    for (final f in fields) {
      f.ctrl.dispose();
    }
    super.dispose();
  }

  Future<void> _predict() async {
    FocusScope.of(context).unfocus();
    final features = <String, dynamic>{};
    for (final f in fields) {
      final text = f.ctrl.text.trim();
      if (f.number) {
        final v = num.tryParse(text);
        if (v == null) {
          setState(() => error = "${tr("Enter a number for")} ${tr(f.label)}");
          return;
        }
        features[f.name] = v;
      } else {
        features[f.name] = text;
      }
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final r = await Api.post("/predict/demand", {"features": features});
      if (mounted) setState(() => result = r is Map ? r : null);
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sub = Theme.of(context).textTheme.bodySmall?.color;
    final prediction = result?["prediction"];
    return Scaffold(
      appBar: AppBar(title: Text(tr("Demand Forecast"))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              tr("Inventory — forecast how many units of an item will sell next week."),
              style: TextStyle(fontSize: 13, color: sub),
            ),
            const SizedBox(height: 14),
            for (final f in fields) ...[
              TextField(
                controller: f.ctrl,
                enabled: !loading,
                keyboardType: f.number
                    ? const TextInputType.numberWithOptions(decimal: true, signed: false)
                    : TextInputType.text,
                inputFormatters: f.number ? [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))] : null,
                decoration: InputDecoration(
                  labelText: tr(f.label),
                  helperText: f.hint == null ? null : tr(f.hint!),
                  helperMaxLines: 2,
                ),
              ),
              const SizedBox(height: 12),
            ],
            if (error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(error!, style: const TextStyle(color: KadeColors.danger)),
              ),
            SizedBox(
              height: 50,
              child: FilledButton(
                onPressed: loading ? null : _predict,
                child: loading
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(tr("Predict")),
              ),
            ),
            if (prediction is num) ...[
              const SizedBox(height: 18),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "≈ ${prediction.toStringAsFixed(0)}",
                        style: const TextStyle(
                          fontSize: 34,
                          fontWeight: FontWeight.w800,
                          color: KadeColors.teal,
                        ),
                      ),
                      Text(tr("units / next week"), style: TextStyle(color: sub)),
                      const SizedBox(height: 4),
                      Text(
                        tr("The model's average error is about 11 units per week (test MAE 10.89)."),
                        style: TextStyle(fontSize: 11, color: sub),
                      ),
                      if (result?["explanation"] is List)
                        InfluenceBars(explanation: result!["explanation"] as List, maxItems: 5),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
