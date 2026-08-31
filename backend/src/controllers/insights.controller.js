import { supabase } from "../config/supabase.js";
import { predict } from "../utils/mlClient.js";
import {
  buildCreditFeatures,
  buildDemandFeatures,
  buildProcurementFeatures,
  buildAnomalyFeatures,
  getTotalSoldByItem,
  getAvgSalePriceByItem,
} from "../utils/features.js";

// CBSL LOW/rural daily limits (must match agencyBanking.controller.js)
const CBSL_LIMITS = { CASH_DEPOSIT: 50000, CASH_WITHDRAWAL: 25000, FUND_TRANSFER: 50000 };

// Amount-based CBSL risk (timestamp-free)
function cbslAmountRisk(type, amount) {
  const key = String(type || "").toUpperCase();
  const limit = CBSL_LIMITS[key];
  if (!limit) return { level: "LOW", ratio: 0, flag: false };
  const ratio = Number(amount || 0) / limit;
  if (ratio >= 1.0) return { level: "HIGH",   ratio, flag: true };
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

  // suppliers.unit_price අයින් කළ නිසා ඒක තව query කරන්නෙ නෑ.
  // Procurement price එක දැන් inventory cost_price එකෙන් ගන්නවා (target item එකෙන්ම).
  const [{ data: inv }, { data: bank }] = await Promise.all([
    supabase.from("inventory").select("*").eq("user_id", userId),
    supabase.from("agency_banking").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(50),
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
  const normName = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const byName = {};
  for (const it of items) {
    const key = normName(it.item_name);
    if (!key) continue;
    if (!byName[key]) {
      byName[key] = { ...it, quantity: Number(it.quantity || 0) };
    } else {
      byName[key].quantity += Number(it.quantity || 0);
      byName[key].reorder_level = Math.max(
        Number(byName[key].reorder_level || 0), Number(it.reorder_level || 0)
      );
      byName[key].cost_price = Number(byName[key].cost_price) || Number(it.cost_price) || 0;
    }
  }
  const uniqueItems = Object.values(byName);

  // Rank items by movement (reorder level = how important to keep stocked)
  // — used for "Buy or Wait" / low-stock urgency, unrelated to sales volume.
  const sortedByMovement = [...uniqueItems].sort(
    (a, b) => Number(b.reorder_level || 0) - Number(a.reorder_level || 0)
  );
  const topItems = sortedByMovement.slice(0, 6);   // show up to 6 high-movement items

  // C2 — demand forecast for each top-SELLING item (LIST)
  // ✅ Previously ranked by reorder_level (a manually-set restock threshold
  // with no link to actual sales volume), so a newly added, never-sold item
  // could take a slot ahead of a real best-seller. Now ranked by real
  // all-time units sold (getTotalSoldByItem, from actual SALE transactions)
  // — items that don't sell naturally sort to the bottom and only appear if
  // there aren't 6 items with real sales yet.
  {
    const totalSold = await getTotalSoldByItem(userId);
    const avgSalePrice = await getAvgSalePriceByItem(userId);
    const normName = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
    const sortedBySales = [...uniqueItems].sort(
      (a, b) => (totalSold[normName(b.item_name)] || 0) - (totalSold[normName(a.item_name)] || 0)
    );

    const list = [];
    for (const item of sortedBySales) {
      if (list.length >= 6) break;
      const { hasSalesHistory, features: demandFeatures } = await buildDemandFeatures(userId, item);
      if (hasSalesHistory) {
        const r = await safePredict("demand", demandFeatures);
        // ✅ Revenue estimate = forecast units × the REAL average price this
        // item actually sold for (not inventory's listed/wholesale price).
        // Rounded to the nearest 100 — the unit forecast itself has ~±21
        // units of average error (model MAE), so an exact-looking rupee
        // figure would be false precision.
        const price = avgSalePrice[normName(item.item_name)]
          || Number(item.cost_price) || Number(item.unit_price) || 0;
        const forecastRevenue = (r.available && price)
          ? Math.round((r.prediction * price) / 100) * 100
          : null;
        list.push({
          item: item.item_name,
          quantity: Number(item.quantity),
          reorder_level: Number(item.reorder_level),
          forecast_units: r.available ? r.prediction : null,
          forecast_revenue: forecastRevenue,
          available: r.available,
        });
      } else {
        list.push({
          item: item.item_name,
          quantity: Number(item.quantity),
          reorder_level: Number(item.reorder_level),
          forecast_units: null,
          forecast_revenue: null,
          available: false,
          reason: "No sales recorded yet for this item",
        });
      }
    }
    out.demand = list.length
      ? { available: true, items: list }
      : { available: false, reason: "Add inventory items to see forecasts." };
  }

  // C3 — buy or wait for each top-moving item (LIST)
  //      Hybrid: reorder rule decides BUY/WAIT, ML model adds price context.
  if (topItems.length > 0) {
    const list = [];
    for (const item of topItems) {
      const qty = Number(item.quantity);
      const reorder = Number(item.reorder_level);
      const price = Number(item.cost_price) || Number(item.unit_price) || 0;

      // primary decision: reorder-level rule
      const action = qty <= reorder ? "BUY" : "WAIT";

      // ML price context (advisory only)
      const r = await safePredict("procurement", buildProcurementFeatures(item, price));
      const mlAction = r.available ? r.recommended_action : null;   // BULK_BUY_NOW / MODERATE_BUY / WAIT_DO_NOT_BUY
      let priceContext = "";
      if (r.available) {
        if (mlAction === "BULK_BUY_NOW" || mlAction === "MODERATE_BUY") priceContext = "Good price right now";
        else if (mlAction === "WAIT_DO_NOT_BUY") priceContext = "Prices may improve soon";
      }

      list.push({
        item: item.item_name,
        quantity: qty,
        reorder_level: reorder,
        action,                                   // BUY / WAIT (reorder rule)
        urgent: action === "BUY",
        price_context: priceContext,              // ML advisory
        buy_confidence: r.available ? r.buy_confidence_score : null,
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
    const finalScore = Math.max(
      r.available ? Number(r.score) || 0 : 0,
      Math.round(amtRisk.ratio * 100)
    );

    out.anomaly = {
      ...r,
      available: true,
      prediction: finalFlag ? 1 : 0,
      score: Math.min(100, finalScore),
      risk_level: amtRisk.level,          // LOW / MEDIUM / HIGH (from CBSL amount)
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