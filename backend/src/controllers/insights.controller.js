import { supabase } from "../config/supabase.js";
import { predict } from "../utils/mlClient.js";
import {
  buildCreditFeatures,
  buildDemandFeatures,
  buildProcurementFeatures,
  buildAnomalyFeatures,
  getTotalSoldByItem,
  getAvgSalePriceByItem,
  getPriceHistories,
  priceTrendForItem,
  forecastReorderLevel,
} from "../utils/features.js";

// CBSL LOW/rural daily limits (must match agencyBanking.controller.js)
const CBSL_LIMITS = { CASH_DEPOSIT: 50000, CASH_WITHDRAWAL: 25000, FUND_TRANSFER: 50000 };

// Amount-based CBSL risk (timestamp-free)
function cbslAmountRisk(type, amount) {
  const key = String(type || "").toUpperCase();
  const limit = CBSL_LIMITS[key];
  if (!limit) return { level: "LOW", ratio: 0, flag: false };
  const ratio = Number(amount || 0) / limit;
  if (ratio >= 1.0) return { level: "HIGH", ratio, flag: true };
  if (ratio >= 0.8) return { level: "MEDIUM", ratio, flag: false };
  return { level: "LOW", ratio, flag: false };
}

/** Run a model without ever throwing — a failed card shows its reason instead. */
async function safePredict(component, features) {
  try {
    const r = await predict(component, features);
    return { available: true, features, ...r };
  } catch (e) {
    const detail = e.response?.data?.detail || e.message;
    return {
      available: false,
      reason: typeof detail === "string" ? detail : "Model unavailable",
    };
  }
}

export const getInsights = async (req, res) => {
  const userId = req.user.id;
  const out = {};

  // Procurement prices come from each inventory item's cost_price (suppliers have no unit price).
  const [{ data: inv }, { data: bank }] = await Promise.all([
    supabase.from("inventory").select("*").eq("user_id", userId),
    supabase
      .from("agency_banking")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const items = inv || [];
  const banking = bank || [];

  // C1 — credit readiness
  const creditFeatures = await buildCreditFeatures(userId);
  out.credit = creditFeatures
    ? await safePredict("credit", creditFeatures)
    : { available: false, reason: "Record some transactions to get a credit score." };

  const lowStock = items
    .filter((i) => Number(i.quantity) <= Number(i.reorder_level))
    .sort((a, b) => Number(a.quantity) - Number(b.quantity));

  // Deduplicate by item name — inventory can have multiple rows (batches / different
  // suppliers) for the same product. Combine quantities so each item appears once.
  const normName = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  const byName = {};
  for (const it of items) {
    const key = normName(it.item_name);
    if (!key) continue;
    if (!byName[key]) {
      byName[key] = { ...it, quantity: Number(it.quantity || 0) };
    } else {
      byName[key].quantity += Number(it.quantity || 0);
      byName[key].reorder_level = Math.max(
        Number(byName[key].reorder_level || 0),
        Number(it.reorder_level || 0),
      );
      byName[key].cost_price = Number(byName[key].cost_price) || Number(it.cost_price) || 0;
    }
  }
  const uniqueItems = Object.values(byName);

  // Most urgent first: quantity ÷ reorder_level, ascending (0 = out of stock sorts first).
  // Items without a reorder level have no threshold and sort last.
  const reorderRatio = (item) => {
    const reorder = Number(item.reorder_level) || 0;
    const qty = Number(item.quantity) || 0;
    if (reorder <= 0) return Infinity;
    return qty / reorder;
  };
  const sortedByUrgency = [...uniqueItems].sort((a, b) => reorderRatio(a) - reorderRatio(b));
  const topItems = sortedByUrgency.slice(0, 6); // show up to 6 most-urgent items

  // C2 — demand forecast for each top-SELLING item (LIST)
  // Ranked by real all-time units sold (getTotalSoldByItem), so best-sellers come first;
  // items that never sold appear only when fewer than 6 items have sales.
  // forecastByItem is reused by Buy or Wait below (demand forecast -> reorder point).
  const forecastByItem = {};
  const avgSalePrice = await getAvgSalePriceByItem(userId);
  {
    const totalSold = await getTotalSoldByItem(userId);
    const normName = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    const sortedBySales = [...uniqueItems].sort(
      (a, b) => (totalSold[normName(b.item_name)] || 0) - (totalSold[normName(a.item_name)] || 0),
    );

    const list = [];
    for (const item of sortedBySales) {
      if (list.length >= 6) break;
      const {
        hasSalesHistory,
        features: demandFeatures,
        history,
      } = await buildDemandFeatures(userId, item, avgSalePrice[normName(item.item_name)]);
      if (hasSalesHistory) {
        const r = await safePredict("demand", demandFeatures);
        if (r.available) forecastByItem[normName(item.item_name)] = r.prediction;
        // Revenue estimate = forecast units × the item's real average selling price, rounded to
        // the nearest 100: the forecast is off by ~11 units on average (test MAE), so an exact
        // rupee figure would be false precision.
        const price =
          avgSalePrice[normName(item.item_name)] || Number(item.cost_price) || Number(item.unit_price) || 0;
        const forecastRevenue = r.available && price ? Math.round((r.prediction * price) / 100) * 100 : null;
        list.push({
          item: item.item_name,
          quantity: Number(item.quantity),
          reorder_level: Number(item.reorder_level),
          forecast_units: r.available ? r.prediction : null,
          forecast_revenue: forecastRevenue,
          available: r.available,
          // past 8 completed weeks, oldest first — the chart's "actual" line
          history: (history || [])
            .slice()
            .reverse()
            .map((w) => ({ week: new Date(w.week).toISOString().slice(0, 10), units: w.units })),
        });
      } else {
        list.push({
          item: item.item_name,
          quantity: Number(item.quantity),
          reorder_level: Number(item.reorder_level),
          forecast_units: null,
          forecast_revenue: null,
          available: false,
          reason: "No sales in the last 8 weeks for this item",
        });
      }
    }
    out.demand = list.length
      ? { available: true, items: list }
      : { available: false, reason: "Add inventory items to see forecasts." };
  }

  // C3 — buy or wait for each top-moving item (LIST)
  //      BUY/WAIT: stock vs a reorder point from the demand forecast (lead time + safety
  //      stock); the manual reorder_level is used only for items with no forecast.
  //      The procurement ML model adds price context.
  if (topItems.length > 0) {
    const histories = await getPriceHistories(userId); // shop's purchase prices, all items at once
    const list = [];
    for (const item of topItems) {
      const qty = Number(item.quantity);
      const reorder = Number(item.reorder_level);
      const price = Number(item.cost_price) || Number(item.unit_price) || 0;

      // weekly demand forecast: reuse the Sales Forecast result, else predict it here
      const key = normName(item.item_name);
      let forecast = forecastByItem[key];
      if (forecast === undefined) {
        const { hasSalesHistory, features: demandFeatures } = await buildDemandFeatures(
          userId,
          item,
          avgSalePrice[key],
        );
        const d = hasSalesHistory ? await safePredict("demand", demandFeatures) : { available: false };
        forecast = d.available ? d.prediction : null;
        forecastByItem[key] = forecast;
      }
      const plan = forecast != null ? forecastReorderLevel(forecast, item.lead_time_days) : null;
      const reorderPoint = plan ? plan.reorder_level : reorder;

      const action = qty <= reorderPoint ? "BUY" : "WAIT";

      // ML price context (advisory only)
      const trend = priceTrendForItem(histories, item.item_name, price);
      const r = await safePredict("procurement", buildProcurementFeatures(item, price, trend));
      const mlAction = r.available ? r.recommended_action : null; // BULK_BUY_NOW / MODERATE_BUY / WAIT_DO_NOT_BUY
      let priceContext = "";
      if (r.available) {
        if (mlAction === "BULK_BUY_NOW" || mlAction === "MODERATE_BUY") priceContext = "Good price right now";
        else if (mlAction === "WAIT_DO_NOT_BUY") priceContext = "Prices may improve soon";
      }

      list.push({
        item: item.item_name,
        quantity: qty,
        reorder_level: reorder, // set by the shop owner
        forecast_units: forecast, // weekly demand forecast (null = no sales history)
        forecast_reorder_level: plan ? plan.reorder_level : null,
        safety_stock: plan ? plan.safety_stock : null,
        decision_basis: plan ? "forecast" : "reorder_level",
        action, // BUY / WAIT
        urgent: action === "BUY",
        price_context: priceContext, // ML advisory
        buy_confidence: r.available ? r.buy_confidence_score : null,
        price_change_4wk_pct: trend.price_change_4wk_pct, // e.g. -8.5 = price fell 8.5% in 4 weeks
        available: true,
      });
    }
    out.procurement = { available: true, items: list };
  } else {
    out.procurement = { available: false, reason: "Add inventory items to see buy/wait advice." };
  }

  // C4 — anomaly check on the latest banking transaction
  //      Hybrid: ML model OR CBSL amount-based risk (over daily limit)
  if (banking.length > 0) {
    const latest = banking[0];
    const r = await safePredict("anomaly", buildAnomalyFeatures(latest, banking));
    const amtRisk = cbslAmountRisk(latest.transaction_type, latest.amount);

    // ML flag (prediction===1) OR CBSL over-limit → final anomaly
    const mlFlag = r.available && r.prediction === 1;
    const finalFlag = mlFlag || amtRisk.flag;
    const finalScore = Math.max(r.available ? Number(r.score) || 0 : 0, Math.round(amtRisk.ratio * 100));

    out.anomaly = {
      ...r,
      available: true,
      prediction: finalFlag ? 1 : 0,
      score: Math.min(100, finalScore),
      risk_level: amtRisk.level, // LOW / MEDIUM / HIGH (from CBSL amount)
      cbsl_ratio_pct: Math.round(amtRisk.ratio * 100),
      customer: latest.customer_name,
      amount: latest.amount,
      reference: latest.reference_code,
    };
  } else {
    out.anomaly = { available: false, reason: "No banking transactions yet." };
  }

  out.lowStock = {
    count: lowStock.length,
    items: lowStock.slice(0, 3).map((i) => ({
      name: i.item_name,
      quantity: i.quantity,
      reorder_level: i.reorder_level,
    })),
  };

  res.json(out);
};

// GET /insights/sales-summary — every inventory item with its all-time units sold, average
// real sale price and revenue, for the "View all items" table (the Sales Forecast card shows 6).
export const getSalesSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data: inv } = await supabase.from("inventory").select("*").eq("user_id", userId);
    const items = inv || [];

    const normName = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    const byName = {};
    for (const it of items) {
      const key = normName(it.item_name);
      if (!key) continue;
      if (!byName[key]) {
        byName[key] = { ...it, quantity: Number(it.quantity || 0) };
      } else {
        byName[key].quantity += Number(it.quantity || 0);
        byName[key].reorder_level = Math.max(
          Number(byName[key].reorder_level || 0),
          Number(it.reorder_level || 0),
        );
      }
    }
    const uniqueItems = Object.values(byName);

    const totalSold = await getTotalSoldByItem(userId);
    const avgSalePrice = await getAvgSalePriceByItem(userId);

    const list = uniqueItems
      .map((item) => {
        const key = normName(item.item_name);
        const sold = totalSold[key] || 0;
        const price = avgSalePrice[key] || Number(item.cost_price) || Number(item.unit_price) || 0;
        return {
          item: item.item_name,
          quantity: Number(item.quantity),
          reorder_level: Number(item.reorder_level),
          total_sold: sold,
          avg_sale_price: price ? +price.toFixed(2) : null,
          // Same nearest-100 rounding as the demand forecast card — avoids
          // an exact-looking rupee figure the underlying data can't support.
          total_revenue: sold && price ? Math.round((sold * price) / 100) * 100 : 0,
        };
      })
      .sort((a, b) => b.total_sold - a.total_sold);

    res.json({ items: list });
  } catch (e) {
    next(e);
  }
};

// GET /insights/procurement-summary — every inventory item's stock vs reorder level, for the
// "View all items" table (the Buy or Wait card shows 6). Rule-based only: no per-item model calls.
export const getProcurementSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data: inv } = await supabase.from("inventory").select("*").eq("user_id", userId);
    const items = inv || [];

    const normName = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    const byName = {};
    for (const it of items) {
      const key = normName(it.item_name);
      if (!key) continue;
      if (!byName[key]) {
        byName[key] = { ...it, quantity: Number(it.quantity || 0) };
      } else {
        byName[key].quantity += Number(it.quantity || 0);
        byName[key].reorder_level = Math.max(
          Number(byName[key].reorder_level || 0),
          Number(it.reorder_level || 0),
        );
      }
    }
    const uniqueItems = Object.values(byName);

    const list = uniqueItems
      .map((item) => {
        const qty = Number(item.quantity);
        const reorder = Number(item.reorder_level);
        const urgent = qty <= reorder;
        return {
          item: item.item_name,
          quantity: qty,
          reorder_level: reorder,
          action: urgent ? "BUY" : "WAIT",
          urgent,
          deficit: Math.max(0, reorder - qty), // how far below the reorder point
        };
      })
      .sort((a, b) => {
        if (a.urgent !== b.urgent) return a.urgent ? -1 : 1; // BUY items first
        return b.deficit - a.deficit; // most urgent first within each group
      });

    res.json({ items: list });
  } catch (e) {
    next(e);
  }
};

/* -------------------------------------------------------------------------- */
/*  Credit what-if: score the shop's real numbers with some of them changed    */
/* -------------------------------------------------------------------------- */
const WHAT_IF_FIELDS = [
  "monthly_revenue_rs",
  "monthly_expenses_rs",
  "avg_daily_txns",
  "digital_payment_ratio",
  "sales_volatility",
  "stockout_rate",
  "months_active",
];

// Apply changes and keep the derived fields (profit, margin) consistent with them
function applyCreditChanges(base, changes) {
  const f = { ...base };
  for (const k of WHAT_IF_FIELDS) if (changes[k] != null) f[k] = Number(changes[k]);
  f.monthly_profit_rs = Math.round(f.monthly_revenue_rs - f.monthly_expenses_rs);
  f.profit_margin_pct =
    f.monthly_revenue_rs > 0 ? +((f.monthly_profit_rs / f.monthly_revenue_rs) * 100).toFixed(2) : 0;
  return f;
}

const creditSummary = (r) => ({
  credit_score: r.credit_score,
  status: r.status,
  max_loan_limit_lkr: r.max_loan_limit_lkr,
  rule_alerts: r.rule_alerts,
  explanation: r.explanation,
});

export const creditWhatIf = async (req, res, next) => {
  try {
    const base = await buildCreditFeatures(req.user.id);
    if (!base) return res.status(400).json({ error: "Record some transactions to get a credit score." });
    const scenarioFeatures = applyCreditChanges(base, req.body.changes || {});
    const [now, scenario] = await Promise.all([predict("credit", base), predict("credit", scenarioFeatures)]);
    res.json({
      base: { ...creditSummary(now), features: base },
      scenario: { ...creditSummary(scenario), features: scenarioFeatures },
      delta: +(scenario.credit_score - now.credit_score).toFixed(1),
    });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/*  Credit action plan: realistic improvements, each scored by the model       */
/* -------------------------------------------------------------------------- */
export const creditActions = async (req, res, next) => {
  try {
    const base = await buildCreditFeatures(req.user.id);
    if (!base) return res.json({ available: false, actions: [] });

    // only steps the merchant can actually take, sized to be realistic
    const steps = [
      { key: "stock", title: "Keep every item in stock", changes: { stockout_rate: 0 } },
      {
        key: "digital",
        title: "Take 20% more payments digitally (card, QR, bank)",
        changes: { digital_payment_ratio: Math.min(1, base.digital_payment_ratio + 0.2) },
      },
      {
        key: "sales",
        title: "Make 20% more sales each day",
        changes: {
          avg_daily_txns: +(base.avg_daily_txns * 1.2).toFixed(2),
          monthly_revenue_rs: Math.round(base.monthly_revenue_rs * 1.2),
        },
      },
      {
        key: "expenses",
        title: "Cut monthly expenses by 10%",
        changes: { monthly_expenses_rs: Math.round(base.monthly_expenses_rs * 0.9) },
      },
      {
        key: "steady",
        title: "Keep daily sales steadier",
        changes: { sales_volatility: +(base.sales_volatility * 0.7).toFixed(3) },
      },
    ].filter((s) => Object.entries(s.changes).some(([k, v]) => v !== base[k])); // skip steps already done

    const [now, ...results] = await Promise.all([
      predict("credit", base),
      ...steps.map((s) => predict("credit", applyCreditChanges(base, s.changes))),
    ]);
    const actions = steps
      .map((s, i) => ({
        key: s.key,
        title: s.title,
        changes: s.changes,
        new_score: results[i].credit_score,
        delta: +(results[i].credit_score - now.credit_score).toFixed(1),
        new_status: results[i].status,
      }))
      .filter((a) => a.delta > 0)
      .sort((a, b) => b.delta - a.delta);

    res.json({ available: true, score: now.credit_score, status: now.status, actions });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
};
