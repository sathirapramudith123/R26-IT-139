import { supabase } from "../config/supabase.js";

const num = (v) => Number(v || 0);
const up  = (v) => String(v || "").toUpperCase();


function daysToAvurudu(d = new Date()) {
  let a = new Date(d.getFullYear(), 3, 14);
  if (d > a) a = new Date(d.getFullYear() + 1, 3, 14);
  return Math.round((a - d) / 86400000);
}
function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - start) / 86400000 + 1) / 7);
}

const itemPrice = (item) => num(item?.cost_price) || num(item?.unit_price) || 0;
const itemCategory = (item) => (item?.category && String(item.category).trim()) || "general";

// median (outlier-resistant)
function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Robust sales volatility — outliers වලින් අහසට යන එක වළක්වනවා.
// Coefficient of variation (std/mean) එක median-normalise කරලා,
// realistic range එකකට clip කරනවා (0 .. 1.5). 4.35 වගේ අගයන් නෑ.
function robustVolatility(dailyTotals) {
  const vals = dailyTotals.filter((v) => v > 0);
  if (vals.length < 2) return 0;

  const med = median(vals);
  if (med <= 0) return 0;

  // Outlier cap: median එකේ 3× ට වඩා වැඩි days cap කරනවා (festival/bulk days)
  const cap = med * 3;
  const capped = vals.map((v) => Math.min(v, cap));

  const mean = capped.reduce((a, b) => a + b, 0) / capped.length;
  const varc = capped.reduce((s, v) => s + (v - mean) ** 2, 0) / capped.length;
  const cv = mean > 0 ? Math.sqrt(varc) / mean : 0;

  // realistic range එකට clip (0 .. 1.5)
  return Math.min(cv, 1.5);
}


export async function buildCreditFeatures(userId) {
  const [{ data: txns }, { data: inv }] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", userId),
    supabase.from("inventory").select("*").eq("user_id", userId),
  ]);
  const t = txns || [];
  const items = inv || [];
  if (t.length === 0) return null;

  const isIncome  = (x) => ["SALE", "DEPOSIT"].includes(up(x.transaction_type));
  const isExpense = (x) => ["PURCHASE", "EXPENSE"].includes(up(x.transaction_type));
  const isDigital = (x) => ["DIGITAL", "BANK"].includes(up(x.payment_method));
  const isCredit  = (x) => ["CREDIT"].includes(up(x.payment_method));

  const dates = t.map((x) => new Date(x.created_at)).sort((a, b) => a - b);
  const daysActive = Math.max(1, (Date.now() - dates[0]) / 86400000);
  const monthsActive = Math.max(1, Math.round(daysActive / 30));

  const revenue  = t.filter(isIncome).reduce((s, x) => s + num(x.amount), 0);
  const expenses = t.filter(isExpense).reduce((s, x) => s + num(x.amount), 0);

  const monthly_revenue_rs  = revenue / monthsActive;
  const monthly_expenses_rs = expenses / monthsActive;
  const monthly_profit_rs   = monthly_revenue_rs - monthly_expenses_rs;
  const profit_margin_pct   = monthly_revenue_rs > 0
    ? (monthly_profit_rs / monthly_revenue_rs) * 100 : 0;

  // daily income totals -> robust volatility
  const byDay = {};
  for (const x of t.filter(isIncome)) {
    const d = new Date(x.created_at).toISOString().slice(0, 10);
    byDay[d] = (byDay[d] || 0) + num(x.amount);
  }
  const sales_volatility = robustVolatility(Object.values(byDay));

  const saleTxns = t.filter(isIncome);
  const creditSales = saleTxns.filter(isCredit).reduce((s, x) => s + num(x.amount), 0);
  const credit_sales_ratio = revenue > 0 ? +(creditSales / revenue).toFixed(3) : 0;

  const stockedOut = items.filter((i) => num(i.quantity) <= num(i.reorder_level)).length;

  return {
    monthly_revenue_rs:    Math.round(monthly_revenue_rs),
    monthly_expenses_rs:   Math.round(monthly_expenses_rs),
    monthly_profit_rs:     Math.round(monthly_profit_rs),
    profit_margin_pct:     +profit_margin_pct.toFixed(2),
    avg_daily_txns:        +(t.length / daysActive).toFixed(2),
    credit_sales_ratio,
    digital_payment_ratio: +(t.filter(isDigital).length / t.length).toFixed(3),
    sales_volatility:      +sales_volatility.toFixed(3),   // දැන් robust (0..1.5)
    stockout_rate:         items.length ? +(stockedOut / items.length).toFixed(3) : 0,
    months_active:         monthsActive,
  };
}

export function buildDemandFeatures(item) {
  const now = new Date();
  const retail = itemPrice(item) || 100;
  const wholesale = retail * 0.85;
  const units = num(item.quantity) || 50;

  return {
    item:                   item.item_name || "Unknown",
    category:               itemCategory(item),
    iso_year:               now.getFullYear(),
    iso_week:               isoWeek(now),
    days_to_avurudu:        daysToAvurudu(now),
    festival_season:        daysToAvurudu(now) <= 30 ? 1 : 0,
    avg_wholesale_price_rs: +wholesale.toFixed(2),
    avg_retail_price_rs:    +retail.toFixed(2),
    lag1_price:             +wholesale.toFixed(2),
    lag4_price:             +wholesale.toFixed(2),
    rolling4_mean_price:    +wholesale.toFixed(2),
    lag1_units:             units,
    lag4_units:             units,
    rolling4_mean_units:    units,
    weekend_share:          0.3,
  };
}


export function buildProcurementFeatures(item, supplierPrice) {
  const now = new Date();
  const current = num(supplierPrice) || itemPrice(item) || 100;

  return {
    item:                 item.item_name || "Unknown",
    category:             itemCategory(item),
    iso_year:             now.getFullYear(),
    iso_week:             isoWeek(now),
    current_price_rs:     +current.toFixed(2),
    price_change_4wk_pct: 0,
    price_vs_3mo_avg_pct: 0,
    days_to_festival:     daysToAvurudu(now),
    festival_season:      daysToAvurudu(now) <= 30 ? 1 : 0,
  };
}


export function buildAnomalyFeatures(txn, allTxns) {
  const amounts = (allTxns || []).map((x) => num(x.amount)).filter((a) => a > 0);
  let z = 0;
  if (amounts.length > 1) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const sd = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length);
    if (sd > 0) z = (num(txn.amount) - mean) / sd;
  }
  const d = new Date(txn.created_at);
  const type = String(txn.transaction_type || "").toLowerCase();

  // Map our transaction types to the training vocabulary (paysim.csv)
  //   deposit -> cash_in, withdrawal -> cash_out, transfer -> transfer
  let txnType = "payment";
  if (type.includes("deposit")) txnType = "cash_in";
  else if (type.includes("withdrawal")) txnType = "cash_out";
  else if (type.includes("transfer")) txnType = "transfer";

  const zscore = +z.toFixed(3);

  return {
    txn_type:        txnType,
    amount_abs_rs:   Math.abs(num(txn.amount)),
    direction:       type.includes("deposit") ? "in" : "out",
    channel:         "agency_banking_agent",           // matches training vocabulary
    weekday:         d.getDay(),
    day_of_month:    d.getDate(),
    created_offline: txn.created_offline ? 1 : 0,
    amount_zscore:   zscore,
    is_high_zscore:  Math.abs(zscore) > 2.0 ? 1 : 0,   // engineered feature (training Step 2)
    unsupervised_anomaly_score: Math.abs(zscore) > 2.5 ? 1 : 0, // proxy for the iso-forest flag
  };
}