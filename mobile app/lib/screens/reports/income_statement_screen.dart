import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/report_pdf.dart';

class IncomeStatementScreen extends StatefulWidget {
  const IncomeStatementScreen({super.key});

  @override
  State<IncomeStatementScreen> createState() => _IncomeStatementScreenState();
}

class _IncomeStatementScreenState extends State<IncomeStatementScreen> {
  bool loading = true;
  String? error;
  Map<String, dynamic>? data;

  @override
  void initState() {
    super.initState();
    _fetchStatement();
  }

  Future<void> _fetchStatement() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      final res = await Api.get("/reports/income-statement");
      if (mounted) {
        setState(() {
          data = res is Map<String, dynamic> && res.containsKey("data")
              ? res["data"]
              : (res is Map<String, dynamic> ? res : {});
          loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = e.toString().replaceFirst("Exception: ", "");
          loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final tealColor = isDark ? KadeColors.tealDark : KadeColors.teal;
    final cardBg = isDark ? Colors.grey[900]! : Colors.white;

    final num rev = data?["total_revenue"] ?? 0;
    final num cogs = data?["cost_of_goods_sold"] ?? 0;
    final num grossProfit = data?["gross_profit"] ?? 0;
    final num opex = data?["operating_expenses"] ?? 0;
    final num netProfit = data?["net_profit"] ?? 0;
    final num margin = data?["profit_margin_pct"] ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Income & Expense Statement",
          style: TextStyle(fontFamily: "Nunito", fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf),
            tooltip: "Download PDF",
            onPressed: (loading || data == null || data!.isEmpty)
                ? null
                : () => shareIncomeStatementPdf(data!),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchStatement,
            tooltip: "Refresh",
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, color: KadeColors.terra, size: 48),
                        const SizedBox(height: 12),
                        Text(
                          error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: KadeColors.terra, fontFamily: "Nunito"),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _fetchStatement,
                          child: const Text("Try Again"),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchStatement,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      // Net Profit / Loss Banner Card
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: netProfit >= 0
                              ? tealColor.withOpacity(0.12)
                              : KadeColors.terra.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: netProfit >= 0 ? tealColor : KadeColors.terra,
                            width: 1.5,
                          ),
                        ),
                        child: Column(
                          children: [
                            Text(
                              netProfit >= 0 ? "NET PROFIT" : "NET LOSS",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                fontFamily: "Nunito",
                                color: netProfit >= 0 ? tealColor : KadeColors.terra,
                                letterSpacing: 1.1,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              "LKR ${netProfit.toStringAsFixed(2)}",
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w900,
                                fontFamily: "Nunito",
                                color: netProfit >= 0 ? tealColor : KadeColors.terra,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "Profit Margin: ${margin.toStringAsFixed(2)}%",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                fontFamily: "Nunito",
                                color: (netProfit >= 0 ? tealColor : KadeColors.terra).withOpacity(0.8),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Breakdown Card
                      Card(
                        color: cardBg,
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(18.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Financial Summary",
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  fontFamily: "Nunito",
                                ),
                              ),
                              const Divider(height: 24),

                              _buildSummaryRow("Total Revenue / Sales", rev, Colors.green),
                              const SizedBox(height: 12),
                              _buildSummaryRow("Cost of Goods Sold", -cogs, Colors.orange),
                              const Divider(height: 24),
                              _buildSummaryRow("Gross Profit", grossProfit, Colors.blue, isBold: true),
                              const SizedBox(height: 12),
                              _buildSummaryRow("Operating Expenses", -opex, KadeColors.terra),
                              const Divider(height: 24),
                              _buildSummaryRow(
                                "Net Income / Profit",
                                netProfit,
                                netProfit >= 0 ? tealColor : KadeColors.terra,
                                isBold: true,
                                isLarge: true,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSummaryRow(
    String title,
    num amount,
    Color color, {
    bool isBold = false,
    bool isLarge = false,
  }) {
    final amountText = amount < 0
        ? "- LKR ${amount.abs().toStringAsFixed(2)}"
        : "LKR ${amount.toStringAsFixed(2)}";

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: isLarge ? 15 : 14,
              fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
              fontFamily: "Nunito",
            ),
          ),
        ),
        Text(
          amountText,
          style: TextStyle(
            fontSize: isLarge ? 16 : 14,
            fontWeight: isBold ? FontWeight.w800 : FontWeight.w700,
            fontFamily: "Nunito",
            color: color,
          ),
        ),
      ],
    );
  }
}