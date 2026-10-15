import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/api.dart';
import '../../core/i18n.dart';
import '../../core/theme.dart';
import '../common/record_details.dart' show money;
import 'prediction_widgets.dart';

/// "Try it yourself": enter a shop's figures and see the credit-readiness score.
/// Same fields and defaults as the web page (frontend/src/app/dashboard/predictions/credit).
class CreditTryScreen extends StatefulWidget {
  const CreditTryScreen({super.key});

  @override
  State<CreditTryScreen> createState() => _CreditTryScreenState();
}

class _Field {
  final String name, label;
  final String? hint;
  final TextEditingController ctrl;
  _Field(this.name, this.label, num value, {this.hint}) : ctrl = TextEditingController(text: "$value");
}

class _CreditTryScreenState extends State<CreditTryScreen> {
  // Defaults: a shop scoring about 60 (conditional approval), so a change can move the score
  // either way. Profit and margin are worked out from sales and expenses.
  final fields = [
    _Field("months_active", "Months in business", 12, hint: "Below 3 months is rejected by the bank rule"),
    _Field("monthly_revenue_rs", "Monthly sales (LKR)", 300000),
    _Field(
      "monthly_expenses_rs",
      "Monthly expenses (LKR)",
      210000,
      hint: "Above 85% of sales is rejected by the bank rule",
    ),
    _Field("avg_daily_txns", "Sales per day", 40),
    _Field("digital_payment_ratio", "Paid digitally (0–1)", 0.4, hint: "0.4 = 40% of payments are digital"),
    _Field("stockout_rate", "Items out of stock (0–1)", 0.1, hint: "Above 0.25 lowers the score a lot"),
    _Field(
      "sales_volatility",
      "Sales volatility (0.1–5)",
      1.0,
      hint: "How much sales go up and down (training scale 0.1–5)",
    ),
    _Field("credit_sales_ratio", "Credit sales (0–1)", 0.2, hint: "Share of sales given on credit"),
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
    final revenue = (features["monthly_revenue_rs"] as num).toDouble();
    final profit = revenue - (features["monthly_expenses_rs"] as num).toDouble();
    features["monthly_profit_rs"] = profit;
    features["profit_margin_pct"] = revenue > 0
        ? double.parse((profit / revenue * 100).toStringAsFixed(2))
        : 0;

    setState(() {
      loading = true;
      error = null;
    });
    try {
      final r = await Api.post("/predict/credit", {"features": features});
      if (mounted) setState(() => result = r is Map ? r : null);
    } catch (e) {
      if (mounted) setState(() => error = e.toString().replaceFirst("Exception: ", ""));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Widget _result() {
    final r = result!;
    final score = (r["credit_score"] as num?)?.toDouble() ?? 0;
    final status = "${r["status"] ?? ""}";
    final (label, color) = status == "APPROVED_PRIME"
        ? ("Approved", KadeColors.success)
        : status == "APPROVED_CONDITIONAL"
        ? ("Conditional approval", KadeColors.warning)
        : ("Not approved", KadeColors.danger);
    final alerts = (r["rule_alerts"] is List)
        ? (r["rule_alerts"] as List).map((a) => "$a").where((a) => a.isNotEmpty && a != "None").toList()
        : <String>[];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                RingGauge(score: score),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
                      Text("${tr("Loan limit")}: ${money(r["max_loan_limit_lkr"] ?? 0)}"),
                    ],
                  ),
                ),
              ],
            ),
            for (final a in alerts)
              Container(
                margin: const EdgeInsets.only(top: 8),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: KadeColors.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(tr(a), style: const TextStyle(fontSize: 12)),
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
      appBar: AppBar(title: Text(tr("Credit Readiness Assessment"))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              tr("Change one value at a time and see how the credit score moves."),
              style: TextStyle(fontSize: 13, color: sub),
            ),
            const SizedBox(height: 14),
            for (final f in fields) ...[
              TextField(
                controller: f.ctrl,
                enabled: !loading,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))],
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
