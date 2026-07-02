class PredictionModel {
  final String title, component, icon;
  final Map<String, dynamic> sampleFeatures;
  const PredictionModel(this.title, this.component, this.icon, this.sampleFeatures);
}

const predictionModels = <PredictionModel>[
  PredictionModel("Credit Readiness", "credit", "💳", {
    "monthly_revenue_rs": 450000, "monthly_expenses_rs": 380000,
    "monthly_profit_rs": 70000, "profit_margin_pct": 15.5,
    "avg_daily_txns": 35, "credit_sales_ratio": 0.1,
    "digital_payment_ratio": 0.3, "sales_volatility": 0.2,
    "stockout_rate": 0.05, "months_active": 18,
  }),
  PredictionModel("Demand Forecast", "demand", "📈", {
    "item": "Rice", "category": "grain", "iso_year": 2025, "iso_week": 26,
    "days_to_avurudu": 120, "festival_season": 0,
    "avg_wholesale_price_rs": 200, "avg_retail_price_rs": 240,
    "lag1_price": 195, "lag4_price": 190, "rolling4_mean_price": 193,
    "lag1_units": 80, "lag4_units": 75, "rolling4_mean_units": 78,
    "weekend_share": 0.3,
  }),
  PredictionModel("Buy Now or Wait", "procurement", "🛒", {
    "item": "Rice", "category": "grain", "iso_year": 2025, "iso_week": 26,
    "current_price_rs": 200, "price_change_4wk_pct": 2.5,
    "price_vs_3mo_avg_pct": 1.2, "days_to_festival": 120, "festival_season": 0,
  }),
  PredictionModel("Banking Anomaly", "anomaly", "🛡", {
    "txn_type": "cash_deposit", "amount_abs_rs": 5000, "direction": "in",
    "channel": "agent", "weekday": 3, "day_of_month": 15,
    "created_offline": 0, "amount_zscore": 0.4,
  }),
];