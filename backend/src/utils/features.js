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

const normName = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

// ✅ Weighted-average REAL sale price per item, from actual SALE
// transactions (amount actually charged ÷ quantity) — not the inventory
// item's listed/wholesale price, which can differ from what customers were
// actually charged (bulk discounts, price changes over time, etc). Used to
// convert a unit demand forecast into a revenue estimate.
export async function getAvgSalePriceByItem(userId) {
  const { data: txns } = await supabase
    .from("transactions")
    .select("item_name, quantity, items")
    .eq("user_id", userId)
    .eq("transaction_type", "SALE");

  const sums = {}; // normalized item name -> { amount, qty }
  for (const t of txns || []) {
    const rows = Array.isArray(t.items) && t.items.length
      ? t.items
      : (t.item_name ? [{ item_name: t.item_name, quantity: t.quantity }] : []);
    for (const line of rows) {
      const key = normName(line.item_name);
      const qty = num(line.quantity);
      if (!key || qty <= 0) continue;
      // Prefer the line's actual charged amount; fall back to unit_price×qty
      // for older rows that only recorded a per-unit price.
      const amount = line.amount != null ? num(line.amount) : num(line.unit_price) * qty;
      if (!sums[key]) sums[key] = { amount: 0, qty: 0 };
      sums[key].amount += amount;
      sums[key].qty += qty;
    }
  }

  const avgPrice = {};
  for (const [key, { amount, qty }] of Object.entries(sums)) {
    if (qty > 0) avgPrice[key] = +(amount / qty).toFixed(2);
  }
  return avgPrice;
}

// ✅ All-time real sales totals, one item name -> total units sold, from
// every SALE transaction (not scoped to a single item like
// getWeeklySalesSeries above). Used to rank items by ACTUAL sales volume —
// e.g. so a "top sellers" list reflects what really sells, not each item's
// manually-set reorder_level (which has no relationship to sales volume).
export async function getTotalSoldByItem(userId) {
  const { data: txns } = await supabase
    .from("transactions")
    .select("item_name, quantity, items")
    .eq("user_id", userId)
    .eq("transaction_type", "SALE");

  const totals = {}; // normalized item name -> total units sold (all-time)
  for (const t of txns || []) {
    const rows = Array.isArray(t.items) && t.items.length
      ? t.items
      : (t.item_name ? [{ item_name: t.item_name, quantity: t.quantity }] : []);
    for (const line of rows) {
      const key = normName(line.item_name);
      if (!key) continue;
      totals[key] = (totals[key] || 0) + num(line.quantity);
    }
  }
  return totals;
}

// ✅ Real weekly SALE history for one item, newest week first — built from
// the `transactions` table (SALE rows), not guessed from current stock.
// Handles both the legacy item_name/quantity columns and the items[] JSONB
// cart shape (a single SALE transaction can contain several items).
//
// Outlier handling: a single unusually large sale-line (e.g. a one-off
// bulk/wholesale order) can dominate a week's total, especially when only
// one week of history exists yet — there's no other week to average it
// against. So each individual sale-line is capped at 3× the median
// sale-line size for this item *before* being summed into a weekly total —
// same approach as robustVolatility() above, applied to demand instead of
// income.
async function getWeeklySalesSeries(userId, itemName) {
  const target = normName(itemName);
  if (!target) return [];

  const { data: txns } = await supabase
    .from("transactions")
    .select("created_at, transaction_type, item_name, quantity, items")
    .eq("user_id", userId)
    .eq("transaction_type", "SALE");

  const lines = [];
  for (const t of txns || []) {
    const rows = Array.isArray(t.items) && t.items.length
      ? t.items
      : (t.item_name ? [{ item_name: t.item_name, quantity: t.quantity }] : []);

    for (const line of rows) {
      if (normName(line.item_name) !== target) continue;
      const d = new Date(t.created_at);
      if (isNaN(d)) continue;
      const qty = num(line.quantity);
      if (qty <= 0) continue;
      lines.push({ date: d, qty });
    }
  }
  if (!lines.length) return [];

  const med = median(lines.map((l) => l.qty));
  const cap = med > 0 ? med * 3 : Infinity;

  const byWeek = {}; // "YYYY-WW" -> total (outlier-capped) units sold that week
  for (const l of lines) {
    const key = `${l.date.getFullYear()}-${String(isoWeek(l.date)).padStart(2, "0")}`;
    byWeek[key] = (byWeek[key] || 0) + Math.min(l.qty, cap);
  }

  return Object.entries(byWeek)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))          // newest week first
    .map(([week, units]) => ({ week, units }));
}

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

// ✅ Previously this faked lag1_units/lag4_units/rolling4_mean_units by
// copying `item.quantity` (current stock) — so an item's forecast reflected
// its stock level, not its actual sales trend, and `item.quantity || 50`
// meant a 0-stock item got a *bigger* fake number (50) than a 46-in-stock
// item. Now it queries real SALE history and returns hasSalesHistory so the
// caller can skip items that have never actually sold, instead of feeding
// the model made-up data.
export async function buildDemandFeatures(userId, item) {
  const now = new Date();
  const retail = itemPrice(item) || 100;
  const wholesale = retail * 0.85;

  const series = await getWeeklySalesSeries(userId, item.item_name);
  const hasSalesHistory = series.length > 0;

  if (!hasSalesHistory) {
    return { hasSalesHistory: false, features: null };
  }

  const last4 = series.slice(0, 4).map((w) => w.units);
  const rollingMean = +(last4.reduce((a, b) => a + b, 0) / last4.length).toFixed(2);
  const lag1Units = last4[0];
  // 4th most-recent week if we have it, else fall back to the rolling mean
  // rather than 0 (0 would read to the model as "sales collapsed").
  const lag4Units = series[3]?.units ?? rollingMean;

  return {
    hasSalesHistory: true,
    features: {
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
      lag1_units:             lag1Units,
      lag4_units:             lag4Units,
      rolling4_mean_units:    rollingMean,
      weekend_share:          0.3,
    },
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