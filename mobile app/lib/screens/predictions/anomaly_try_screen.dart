import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/api.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import 'prediction_widgets.dart';

/// "Try it yourself": enter an agency-banking transaction and see whether the anomaly model
/// flags it. Same fields and defaults as the web page (frontend/src/app/dashboard/predictions/anomaly).
class AnomalyTryScreen extends StatefulWidget {
  const AnomalyTryScreen({super.key});

  @override
  State<AnomalyTryScreen> createState() => _AnomalyTryScreenState();
}

class _Field {
  final String name, label;
  final String? hint;
  final bool signed;
  final TextEditingController ctrl;
  _Field(this.name, this.label, num value, {this.hint, this.signed = false})
    : ctrl = TextEditingController(text: "$value");
}

// In the training data the direction and channel follow from the transaction type
const _typeInfo = {
  "cash_in": ("in", "agency_banking_agent"),
  "cash_out": ("out", "agency_banking_agent"),
  "transfer": ("out", "bank_transfer"),
  "payment": ("out", "LankaQR"),
  "debit": ("out", "POS_card"),
};

class _AnomalyTryScreenState extends State<AnomalyTryScreen> {
  // Defaults: an ordinary cash deposit; the hint shows a transaction the model flags.
  String txnType = "cash_in";
  final fields = [
    _Field(
      "amount_abs_rs",
      "Amount (LKR)",
      5000,
      hint: "Try: transfer, 950000 and z-score 3.2 — it gets flagged",
    ),
    _Field(
      "amount_zscore",
      "Amount z-score",
      -0.3,
      signed: true,
      hint: "How unusual the amount is for this type (above 2 = unusual)",
    ),
    _Field("weekday", "Weekday (0 = Monday … 6 = Sunday)", 2),
    _Field("day_of_month", "Day of month", 14),
    _Field("created_offline", "Created offline (0/1)", 0, hint: "1 = recorded while the agent was offline"),
  ];
  bool loading = false;
  String? error;
  Map? result;

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
      final v = num.tryParse(f.ctrl.text.trim());
      if (v == null) {
        setState(() => error = "${tr("Enter a number for")} ${tr(f.label)}");
        return;
      }
      features[f.name] = v;
    }
    final info = _typeInfo[txnType]!;
    features["txn_type"] = txnType;
    features["direction"] = info.$1;
    features["channel"] = info.$2;
    features["is_high_zscore"] = (features["amount_zscore"] as num).abs() > 2 ? 1 : 0;

    setState(() {
      loading = true;
      error = null;
    });
    try {
      final r = await Api.post("/predict/anomaly", {"features": features});
      if (mounted) setState(() => result = r is Map ? r : null);
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Widget _result() {
    final r = result!;
    final flagged = r["is_anomaly"] == true || r["prediction"] == 1;
    final risk = (r["score"] as num?)?.toDouble() ?? 0;
    final threshold = ((r["threshold"] as num?)?.toDouble() ?? 0.87) * 100;
    final color = flagged ? KadeColors.danger : KadeColors.success;
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
                flagged ? tr("🚨 Flagged — ask the agent to verify the customer") : tr("✓ Looks normal"),
                style: TextStyle(fontWeight: FontWeight.w700, color: color),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              "${tr("Risk")}: ${risk.toStringAsFixed(1)}%  (${tr("flag at")} ${threshold.toStringAsFixed(0)}%)",
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: (risk / 100).clamp(0, 1).toDouble(),
                minHeight: 8,
                color: color,
                backgroundColor: color.withValues(alpha: 0.15),
              ),
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
      appBar: AppBar(title: Text(tr("Banking Anomaly Detection"))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              tr("Enter an agency-banking transaction and see whether the model flags it."),
              style: TextStyle(fontSize: 13, color: sub),
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: txnType,
              decoration: InputDecoration(labelText: tr("Transaction type")),
              items: _typeInfo.keys.map((k) => DropdownMenuItem(value: k, child: Text(k))).toList(),
              onChanged: loading ? null : (v) => setState(() => txnType = v ?? "cash_in"),
            ),
            const SizedBox(height: 12),
            for (final f in fields) ...[
              TextField(
                controller: f.ctrl,
                enabled: !loading,
                keyboardType: TextInputType.numberWithOptions(decimal: true, signed: f.signed),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(f.signed ? r'^[-+]?\d*\.?\d*' : r'^\d*\.?\d*')),
                ],
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
