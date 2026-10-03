import { supabase } from "../config/supabase.js";
import { localParts, localDateStr, localWeekStart } from "./time.js";

const num = (v) => Number(v || 0);
const up = (v) => String(v || "").toUpperCase();

// Whole days from d's Sri Lanka date to the next Avurudu (14 April) — a date difference,
// the same as the training data (week of 2022-06-13 -> 305).
function daysToAvurudu(d = new Date()) {
  const p = localParts(d);
  const today = Date.UTC(p.year, p.month - 1, p.day);
  let a = Date.UTC(p.year, 3, 14);
  if (a < today) a = Date.UTC(p.year + 1, 3, 14);
  return Math.round((a - today) / 86400000);
}
// ISO-8601 year (the year that owns the ISO week; differs from getFullYear() around New Year)
function isoYear(d = new Date()) {
  const p = localParts(d); // Sri Lanka date
  const t = new Date(Date.UTC(p.year, p.month - 1, p.day));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return t.getUTCFullYear();
}
function isoWeek(d = new Date()) {
  const p = localParts(d); // Sri Lanka date
  const t = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - start) / 86400000 + 1) / 7);
}

const itemPrice = (item) => num(item?.cost_price) || num(item?.unit_price) || 0;
const itemCategory = (item) => (item?.category && String(item.category).trim()) || "general";

const normName = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// Weighted-average real sale price per item, from actual SALE
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
    const rows =
      Array.isArray(t.items) && t.items.length
        ? t.items
        : t.item_name
          ? [{ item_name: t.item_name, quantity: t.quantity }]
          : [];
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

// All-time real sales totals, one item name -> total units sold, from
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
    const rows =
      Array.isArray(t.items) && t.items.length
        ? t.items
        : t.item_name
          ? [{ item_name: t.item_name, quantity: t.quantity }]
          : [];
    for (const line of rows) {
      const key = normName(line.item_name);
      if (!key) continue;
      totals[key] = (totals[key] || 0) + num(line.quantity);
    }
  }
  return totals;
}

// Real weekly SALE history for one item, newest week first — built from
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
// Weekly units sold for one item over the last `weeks` COMPLETED calendar weeks,
// newest first: [{ week, units }]. Weeks with no sales are included as 0 and the
// current (unfinished) week is left out — the same definitions as the training data
// (ML model/inventory/demand_forecast_weekly.csv): lag1 = last week, lag4 = 4 weeks ago,
// rolling4 = mean of the 4 past weeks.
async function getWeeklySalesSeries(userId, itemName, weeks = 8, now = new Date()) {
  const target = normName(itemName);
  if (!target) return [];

  const { data: txns } = await supabase
    .from("transactions")
    .select("created_at, transaction_type, item_name, quantity, items")
    .eq("user_id", userId)
    .eq("transaction_type", "SALE");

  const lines = [];
  for (const t of txns || []) {
    const rows =
      Array.isArray(t.items) && t.items.length
        ? t.items
        : t.item_name
          ? [{ item_name: t.item_name, quantity: t.quantity }]
          : [];

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

  const lastFullWeek = weekStart(now) - WEEK_MS;
  const byWeek = new Map(); // ISO week (Monday, UTC ms) -> total (outlier-capped) units sold
  for (const l of lines) {
    const w = weekStart(l.date);
    if (w > lastFullWeek) continue; // this week is not finished yet
    byWeek.set(w, (byWeek.get(w) || 0) + Math.min(l.qty, cap));
  }

  const series = [];
  for (let i = 0; i < weeks; i++) {
    const w = lastFullWeek - i * WEEK_MS;
    series.push({ week: w, units: +(byWeek.get(w) || 0).toFixed(2) });
  }
  return series;
}

// median (outlier-resistant)
function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Robust sales volatility: coefficient of variation (std / mean) of daily sales, with outlier
// days capped, clipped to a realistic range (0 .. 1.5).
function robustVolatility(dailyTotals) {
  const vals = dailyTotals.filter((v) => v > 0);
  if (vals.length < 2) return 0;

  const med = median(vals);
  if (med <= 0) return 0;

  // cap days above 3× the median (festival / bulk days)
  const cap = med * 3;
  const capped = vals.map((v) => Math.min(v, cap));

  const mean = capped.reduce((a, b) => a + b, 0) / capped.length;
  const varc = capped.reduce((s, v) => s + (v - mean) ** 2, 0) / capped.length;
  const cv = mean > 0 ? Math.sqrt(varc) / mean : 0;

  // clip to the realistic range (0 .. 1.5)
  return Math.min(cv, 1.5);
}

// C1 credit features — the same definitions as the income statement (report.controller.js):
//   revenue  = SALE amounts only (DEPOSIT / TRANSFER are money moved in, not income)
//   expenses = COGS (cost of the items sold) + EXPENSE rows
//              (PURCHASE is cash → stock, not an expense; counting it as well as COGS
//              would count the same goods twice)
// Returns null when the shop has no sales yet — there is nothing to score.
export async function buildCreditFeatures(userId) {
  const [{ data: txns }, { data: inv }] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", userId),
    supabase.from("inventory").select("*").eq("user_id", userId),
  ]);
  const t = txns || [];
  const items = inv || [];
  const sales = t.filter((x) => up(x.transaction_type) === "SALE");
  if (sales.length === 0) return null;

  const isDigital = (x) => ["DIGITAL", "BANK"].includes(up(x.payment_method));

  const dates = t
    .map((x) => new Date(x.created_at))
    .filter((d) => !isNaN(d))
    .sort((a, b) => a - b);
  const daysActive = Math.max(1, (Date.now() - dates[0]) / 86400000);
  const monthsActive = Math.max(1, Math.round(daysActive / 30));

  // unit cost per item (fallback when a sale line has no cost_price snapshot)
  const costMap = {};
  for (const i of items) {
    const key = normName(i.item_name);
    if (key && costMap[key] == null) costMap[key] = itemPrice(i);
  }

  let revenue = 0,
    cogs = 0,
    digitalRevenue = 0;
  const byDay = {};
  for (const x of sales) {
    const amount = num(x.amount);
    revenue += amount;
    if (isDigital(x)) digitalRevenue += amount;
    const d = new Date(x.created_at);
    if (!isNaN(d)) {
      const day = localDateStr(d); // Sri Lanka day, not the UTC day
      byDay[day] = (byDay[day] || 0) + amount;
    }
    const lines =
      Array.isArray(x.items) && x.items.length
        ? x.items
        : x.item_name
          ? [{ item_name: x.item_name, quantity: x.quantity }]
          : [];
    for (const line of lines) {
      const unitCost =
        line.cost_price != null ? num(line.cost_price) : costMap[normName(line.item_name)] || 0;
      cogs += unitCost * num(line.quantity);
    }
  }
  const operatingExpenses = t
    .filter((x) => up(x.transaction_type) === "EXPENSE")
    .reduce((s, x) => s + num(x.amount), 0);
  const expenses = cogs + operatingExpenses;

  const monthly_revenue_rs = revenue / monthsActive;
  const monthly_expenses_rs = expenses / monthsActive;
  const monthly_profit_rs = monthly_revenue_rs - monthly_expenses_rs;
  const profit_margin_pct = monthly_revenue_rs > 0 ? (monthly_profit_rs / monthly_revenue_rs) * 100 : 0;

  const sales_volatility = robustVolatility(Object.values(byDay));

  // stock-out share per product, not per inventory row — several batches of one item
  // are added together first (same as the low-stock list in insights.controller.js)
  const byName = {};
  for (const i of items) {
    const key = normName(i.item_name);
    if (!key) continue;
    if (!byName[key]) byName[key] = { qty: 0, reorder: 0 };
    byName[key].qty += num(i.quantity);
    byName[key].reorder = Math.max(byName[key].reorder, num(i.reorder_level));
  }
  const products = Object.values(byName);
  const stockedOut = products.filter((p) => p.qty <= p.reorder).length;

  return {
    monthly_revenue_rs: Math.round(monthly_revenue_rs),
    monthly_expenses_rs: Math.round(monthly_expenses_rs),
    monthly_profit_rs: Math.round(monthly_profit_rs),
    profit_margin_pct: +profit_margin_pct.toFixed(2),
    avg_daily_txns: +(sales.length / daysActive).toFixed(2), // sales per day
    // The app has no "sold on credit" payment method yet, so this cannot be measured.
    // null → the ML service fills in the training median instead of a fake 0 (which
    // the model would read as "never sells on credit" and reward).
    credit_sales_ratio: null,
    digital_payment_ratio: +(digitalRevenue / revenue || 0).toFixed(3), // share of sales revenue paid digitally
    sales_volatility: +sales_volatility.toFixed(3), // robust, 0..1.5
    stockout_rate: products.length ? +(stockedOut / products.length).toFixed(3) : 0,
    months_active: monthsActive,
  };
}

// Demand-model inputs from the item's real weekly SALE history. hasSalesHistory is false when the
// item has not sold in the last 8 completed weeks, so the caller can skip it instead of guessing.
// avgRetailPrice: the item's real average selling price (getAvgSalePriceByItem), if known.
export async function buildDemandFeatures(userId, item, avgRetailPrice = null, now = new Date()) {
  const series = await getWeeklySalesSeries(userId, item.item_name, 8, now);
  const units = series.map((w) => w.units);
  // Lags need recent weeks: no sales in the last 8 completed weeks -> no forecast
  if (!units.some((u) => u > 0)) {
    return { hasSalesHistory: false, features: null };
  }

  const lag1Units = units[0]; // last completed week
  const lag4Units = units[3]; // 4 completed weeks ago
  const rollingMean = +((units[0] + units[1] + units[2] + units[3]) / 4).toFixed(2); // past 4 weeks only

  // Prices: retail = what customers actually paid, wholesale = what the shop pays.
  // (Training data: retail ≈ 1.2 × wholesale, used only when one side is unknown.)
  const cost = itemPrice(item);
  const retail = num(avgRetailPrice) || (cost ? cost * 1.2 : 100);
  const wholesale = cost || retail / 1.2;

  return {
    hasSalesHistory: true,
    features: {
      item: item.item_name || "Unknown",
      category: itemCategory(item),
      iso_year: isoYear(now),
      iso_week: isoWeek(now),
      days_to_avurudu: daysToAvurudu(now),
      // demand_forecast_weekly.csv: festival_season = 1 for 0..21 days before Avurudu
      festival_season: daysToAvurudu(now) <= 21 ? 1 : 0,
      avg_wholesale_price_rs: +wholesale.toFixed(2),
      avg_retail_price_rs: +retail.toFixed(2),
      // Only used by the older monthly model (component3_demand_forecast_model.pkl before
      // inventory_weekly.ipynb); the weekly model ignores them.
      lag1_price: +retail.toFixed(2),
      lag4_price: +retail.toFixed(2),
      rolling4_mean_price: +retail.toFixed(2),
      lag1_units: lag1Units,
      lag4_units: lag4Units,
      rolling4_mean_units: rollingMean,
      weekend_share: 0.29, // constant in the weekly training data
    },
  };
}

// Reorder point from the weekly demand forecast (inventory_weekly.ipynb, section 7):
// units needed until the next delivery + safety stock for the forecast error.
const DEMAND_TEST_RMSE_UNITS = 24.79; // weekly model, test period
const SERVICE_LEVEL_Z = 1.65; // ~95 % chance of not running out before delivery

export function forecastReorderLevel(weeklyForecastUnits, leadTimeDays) {
  const weeks = Math.max(num(leadTimeDays), 1) / 7;
  const safety = SERVICE_LEVEL_Z * DEMAND_TEST_RMSE_UNITS * Math.sqrt(weeks);
  return {
    reorder_level: Math.round(num(weeklyForecastUnits) * weeks + safety),
    safety_stock: Math.round(safety),
  };
}

export function buildProcurementFeatures(item, supplierPrice, trend = {}) {
  const now = new Date();
  const current = num(supplierPrice) || itemPrice(item) || 100;

  return {
    item: item.item_name || "Unknown",
    category: itemCategory(item),
    iso_year: isoYear(now), // ISO year that owns iso_week (Sri Lanka date)
    iso_week: isoWeek(now),
    current_price_rs: +current.toFixed(2),
    // null (no purchase history) -> the ML service uses 0, i.e. "no recent change"
    price_change_4wk_pct: trend.price_change_4wk_pct ?? null,
    price_vs_3mo_avg_pct: trend.price_vs_3mo_avg_pct ?? null,
    days_to_festival: daysToAvurudu(now),
    // from_rice_veg_2023_2026.csv: festival_season = 1 for 1..43 days before Avurudu (ISO weeks 10-16)
    festival_season: daysToAvurudu(now) <= 45 ? 1 : 0,
  };
}

export function buildAnomalyFeatures(txn, allTxns) {
  // Training data (paysim.csv): amount_zscore = amount standardised within its transaction type,
  // so a deposit is compared only with the agent's recent deposits, a withdrawal with withdrawals.
  const sameType = (x) =>
    String(x.transaction_type || "").toUpperCase() === String(txn.transaction_type || "").toUpperCase();
  const amounts = (allTxns || [])
    .filter(sameType)
    .map((x) => num(x.amount))
    .filter((a) => a > 0);
  let z = 0;
  if (amounts.length > 1) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const sd = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length);
    if (sd > 0) z = (num(txn.amount) - mean) / sd;
  }
  // Sri Lanka local time (server may run in UTC)
  const d = localParts(txn.created_at || Date.now());
  const type = String(txn.transaction_type || "").toLowerCase();

  // Map our transaction types to the training vocabulary (paysim.csv)
  //   deposit -> cash_in, withdrawal -> cash_out, transfer -> transfer
  let txnType = "payment";
  if (type.includes("deposit")) txnType = "cash_in";
  else if (type.includes("withdrawal")) txnType = "cash_out";
  else if (type.includes("transfer")) txnType = "transfer";

  const zscore = +z.toFixed(3);

  return {
    txn_type: txnType,
    amount_abs_rs: Math.abs(num(txn.amount)),
    direction: type.includes("deposit") ? "in" : "out",
    channel: "agency_banking_agent", // matches training vocabulary
    weekday: d.weekday, // pandas convention: Monday=0 ... Sunday=6
    day_of_month: d.day,
    created_offline: txn.created_offline ? 1 : 0,
    amount_zscore: zscore,
    is_high_zscore: Math.abs(zscore) > 2.0 ? 1 : 0, // engineered feature (training Step 2)
    unsupervised_anomaly_score: Math.abs(zscore) > 2.5 ? 1 : 0, // proxy for the iso-forest flag
  };
}

// ── Price trend features for the procurement (buy now / wait) model ─────────
// Same definitions as the training data (ML model/procument/from_rice_veg_2023_2026.csv):
//   price_change_4wk_pct = (price now / price 4 weeks ago − 1) × 100
//   price_vs_3mo_avg_pct = (price now / mean of the last 13 weekly prices incl. this week − 1) × 100
// The price history comes from the shop's own purchases (PURCHASE transactions and
// RECEIVED procurement orders), one quantity-weighted price per ISO week.
const WEEK_MS = 7 * 86400000;

// Monday 00:00 (Sri Lanka time) of the ISO week that contains d, as a ms timestamp.
// Weeks are then stepped with WEEK_MS, which is exact for a fixed-offset timezone
// such as Asia/Colombo (no daylight saving).
const weekStart = (d) => localWeekStart(d);

// All of a user's purchase prices, grouped by item: { normName -> [{ week, price }] }
export async function getPriceHistories(userId) {
  const [{ data: txns }, { data: procs }] = await Promise.all([
    supabase
      .from("transactions")
      .select("created_at, items, item_name, quantity, amount")
      .eq("user_id", userId)
      .eq("transaction_type", "PURCHASE"),
    supabase
      .from("procurement")
      .select("created_at, order_date, arrival_date, items, item_name, quantity, total_cost")
      .eq("user_id", userId)
      .eq("procurement_status", "RECEIVED"),
  ]);

  const perItem = {}; // normName -> Map(week -> { v: price×qty, q: qty })
  const add = (date, name, qty, price) => {
    const key = normName(name);
    const p = num(price);
    if (!key || !(p > 0) || !date) return;
    const q = num(qty) > 0 ? num(qty) : 1;
    const w = weekStart(date);
    const weeks = (perItem[key] ||= new Map());
    const cell = weeks.get(w) || { v: 0, q: 0 };
    cell.v += p * q;
    cell.q += q;
    weeks.set(w, cell);
  };

  for (const t of txns || []) {
    if (Array.isArray(t.items) && t.items.length) {
      for (const l of t.items) add(t.created_at, l.item_name, l.quantity, l.unit_price ?? l.cost_price);
    } else if (t.item_name && num(t.quantity) > 0) {
      add(t.created_at, t.item_name, t.quantity, num(t.amount) / num(t.quantity));
    }
  }
  for (const p of procs || []) {
    const date = p.arrival_date || p.order_date || p.created_at;
    if (Array.isArray(p.items) && p.items.length) {
      for (const l of p.items) add(date, l.item_name, l.quantity, l.unit_cost ?? l.cost_price);
    } else if (p.item_name && num(p.quantity) > 0) {
      add(date, p.item_name, p.quantity, num(p.total_cost) / num(p.quantity));
    }
  }

  const out = {};
  for (const [key, weeks] of Object.entries(perItem)) {
    out[key] = [...weeks.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, c]) => ({ week, price: c.v / c.q }));
  }
  return out;
}

// history: [{ week, price }] sorted by week. Weeks without a purchase keep the last known price.
export function priceTrendFeatures(history, currentPrice, now = new Date()) {
  if (!history || !history.length) return { price_change_4wk_pct: null, price_vs_3mo_avg_pct: null };

  const thisWeek = weekStart(now);
  const series = [];
  let i = 0;
  let last = null;
  for (let t = history[0].week; t <= thisWeek; t += WEEK_MS) {
    while (i < history.length && history[i].week <= t) last = history[i++].price;
    series.push(last);
  }
  if (!series.length) return { price_change_4wk_pct: null, price_vs_3mo_avg_pct: null };
  const cur = num(currentPrice) || series[series.length - 1];
  series[series.length - 1] = cur;

  const n = series.length;
  const change = n > 4 ? (cur / series[n - 5] - 1) * 100 : null;
  const window = series.slice(-13);
  const avg = window.reduce((a, b) => a + b, 0) / window.length;

  return {
    price_change_4wk_pct: change == null ? null : +change.toFixed(2),
    price_vs_3mo_avg_pct: +((cur / avg - 1) * 100).toFixed(2),
  };
}

// Convenience: trend for one inventory item from the histories map
export const priceTrendForItem = (histories, itemName, currentPrice) =>
  priceTrendFeatures((histories || {})[normName(itemName)], currentPrice);
