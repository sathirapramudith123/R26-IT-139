import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/api.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import '../common/record_details.dart' show money;
import 'prediction_widgets.dart';
import 'try_helpers.dart';

/// "Try it yourself": enter an item's market price trend and see the Buy now / Wait advice.
/// Same fields and defaults as the web page (frontend/src/app/dashboard/predictions/procurement).
class ProcurementTryScreen extends StatefulWidget {
  const ProcurementTryScreen({super.key});

  @override
  State<ProcurementTryScreen> createState() => _ProcurementTryScreenState();
}

class _Field {
  final String name, label;
  final String? hint;
  final bool number, signed;
  final TextEditingController ctrl;
  _Field(this.name, this.label, Object value, {this.hint, this.number = true, this.signed = false})
    : ctrl = TextEditingController(text: "$value");
}

class _ProcurementTryScreenState extends State<ProcurementTryScreen> {
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
    // Defaults: a carrot whose price fell 15% in 4 weeks — the model advises buying;
    // make the change +18% to see "wait".
    fields = [
      _Field(
        "item",
        "Item",
        "Carrot",
        number: false,
        hint: "e.g. Carrot, Beans, Cabbage, Brinjals, Big Onion (Local)",
      ),
      _Field(
        "category",
        "Category",
        "Up Country",
        number: false,
        hint: "Up Country, Low Country, Fruit or Grocery/Staple",
      ),
      _Field("iso_year", "ISO Year", iso.year),
      _Field("iso_week", "ISO Week", iso.week),
      _Field("current_price_rs", "Today's price (LKR)", 300),
      _Field(
        "price_change_4wk_pct",
        "Price change in the last 4 weeks (%)",
        -15,
        signed: true,
        hint: "Negative = the price fell. Try +18 to see the advice change",
      ),
      _Field(
        "price_vs_3mo_avg_pct",
        "Today's price vs the 3-month average (%)",
        -12,
        signed: true,
        hint: "Negative = below the usual price",
      ),
      _Field("days_to_festival", "Days to Avurudu", days),
      _Field(
        "festival_season",
        "Festival Season (0/1)",
        days >= 1 && days <= 43 ? 1 : 0,
        hint: "1 when Avurudu is 1–43 days away",
      ),
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
      final r = await Api.post("/predict/procurement", {"features": features});
      if (mounted) setState(() => result = r is Map ? r : null);
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Widget _result() {
    final r = result!;
    final action = "${r["recommended_action"] ?? ""}";
    final (label, color) = action == "BULK_BUY_NOW"
        ? ("Buy now — in bulk", KadeColors.success)
        : action == "MODERATE_BUY"
        ? ("Buy now", KadeColors.success)
        : ("Wait — prices may improve", KadeColors.warning);
    final now = (r["current_price_lkr"] as num?)?.toDouble() ?? 0;
    final later = (r["predicted_4w_price_lkr"] as num?)?.toDouble() ?? 0;
    final change = now > 0 ? (later - now) / now * 100 : 0.0;
    final chance = (r["buy_confidence_score"] as num?)?.toDouble() ?? 0;
    final sub = Theme.of(context).textTheme.bodySmall?.color;

    Widget price(String title, String value, {String? extra, Color? extraColor}) => Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(tr(title), style: TextStyle(fontSize: 11, color: sub)),
            Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            if (extra != null) Text(extra, style: TextStyle(fontSize: 11, color: extraColor)),
          ],
        ),
      ),
    );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text(
                tr(label),
                style: TextStyle(fontWeight: FontWeight.w700, color: color),
              ),
            ),
            const SizedBox(height: 8),
            Text("${tr("Chance the price rises in 4 weeks")}: ${chance.toStringAsFixed(0)}%"),
            const SizedBox(height: 12),
            Row(
              children: [
                price("Price today", money(now)),
                const SizedBox(width: 10),
                price(
                  "Expected price in 4 weeks",
                  money(later),
                  extra: "${change >= 0 ? "+" : ""}${change.toStringAsFixed(1)}%",
                  extraColor: change > 0 ? KadeColors.danger : KadeColors.success,
                ),
              ],
            ),
            if (r["explanation"] is List) InfluenceBars(explanation: r["explanation"] as List, maxItems: 5),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sub = Theme.of(context).textTheme.bodySmall?.color;
    return Scaffold(
      appBar: AppBar(title: Text(tr("Procurement Optimizer"))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              tr("Buy now or wait? Enter an item's market price trend and see the advice."),
              style: TextStyle(fontSize: 13, color: sub),
            ),
            const SizedBox(height: 14),
            for (final f in fields) ...[
              TextField(
                controller: f.ctrl,
                enabled: !loading,
                keyboardType: f.number
                    ? TextInputType.numberWithOptions(decimal: true, signed: f.signed)
                    : TextInputType.text,
                inputFormatters: f.number
                    ? [
                        FilteringTextInputFormatter.allow(
                          RegExp(f.signed ? r'^[-+]?\d*\.?\d*' : r'^\d*\.?\d*'),
                        ),
                      ]
                    : null,
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
            if (result != null) ...[const SizedBox(height: 18), _result()],
          ],
        ),
      ),
    );
  }
}
