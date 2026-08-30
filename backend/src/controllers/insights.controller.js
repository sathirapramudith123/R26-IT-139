import { supabase } from "../config/supabase.js";
import { predict } from "../utils/mlClient.js";
import {
  buildCreditFeatures,
  buildDemandFeatures,
  buildProcurementFeatures,
  buildAnomalyFeatures,
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

  // C2 — demand forecast for the lowest-stock item
  if (lowStock.length > 0) {
    const target = lowStock[0];
    const r = await safePredict("demand", buildDemandFeatures(target));
    out.demand = { ...r, item: target.item_name };
  } else {
    out.demand = { available: false, reason: "No items are low on stock." };
  }

  // C3 — buy now or wait, for that same item
  //      price එක target item එකේ cost_price එකෙන් (suppliers.unit_price අයින් කළා)
  if (lowStock.length > 0) {
    const target = lowStock[0];
    const price = Number(target.cost_price) || Number(target.unit_price) || 0;
    const r = await safePredict("procurement", buildProcurementFeatures(target, price));
    out.procurement = { ...r, item: target.item_name };
  } else {
    out.procurement = { available: false, reason: "Nothing to procure right now." };
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