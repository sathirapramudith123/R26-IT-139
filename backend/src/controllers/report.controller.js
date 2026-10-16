import { supabase } from "../config/supabase.js";
import { isDrawings } from "../utils/doubleEntry.js";
import { summarizeByMethod } from "../utils/paymentMethods.js";
import { localDateStr, localDayStart, addDays } from "../utils/time.js";

const num = (v) => Number(v) || 0;

// Item lines of a SALE (items JSONB array, or the legacy single item_name/quantity)
const saleLines = (t) => {
  if (Array.isArray(t.items) && t.items.length) return t.items;
  if (t.item_name && t.quantity) return [{ item_name: t.item_name, quantity: t.quantity }];
  return [];
};

export const getIncomeStatement = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Load transactions and inventory together
    // (COGS needs the inventory cost_price when a sale line has no cost snapshot)
    const [{ data: transactions, error: txErr }, { data: inventory, error: invErr }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId),
      supabase.from("inventory").select("item_name, cost_price, unit_price").eq("user_id", userId),
    ]);

    if (txErr) throw txErr;
    if (invErr) throw invErr;

    // item_name -> unit cost map (fallback)
    const costMap = {};
    (inventory || []).forEach((i) => {
      costMap[i.item_name] = num(i.cost_price ?? i.unit_price);
    });

    let totalRevenue = 0;
    let costOfGoodsSold = 0;
    let operatingExpenses = 0;

    (transactions || []).forEach((t) => {
      const amount = num(t.amount);
      const type = `${t.transaction_type}`.toLowerCase();

      if (type === "sale") {
        // Revenue = amount sold (selling price)
        totalRevenue += amount;

        // COGS = cost of the goods sold only
        saleLines(t).forEach((line) => {
          const qty = num(line.quantity);
          // the sale line's cost snapshot if present, otherwise the current inventory cost
          const unitCost = line.cost_price != null ? num(line.cost_price) : costMap[line.item_name] || 0;
          costOfGoodsSold += unitCost * qty;
        });
      } else if (type === "expense" && !isDrawings(t.category)) {
        operatingExpenses += amount; // owner's drawings are not an expense
      }
      // PURCHASE -> cash→stock asset swap; does not affect P&L.
      // DEPOSIT / TRANSFER -> financing / pass-through; not income.
    });

    const grossProfit = totalRevenue - costOfGoodsSold;
    const netProfit = grossProfit - operatingExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        total_revenue: totalRevenue,
        cost_of_goods_sold: costOfGoodsSold,
        gross_profit: grossProfit,
        operating_expenses: operatingExpenses,
        net_profit: netProfit,
        profit_margin_pct: profitMargin,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /reports/payment-methods?from=2026-10-01&to=2026-10-31 (or ?year=2026&month=10) — money in /
// out per Cash, Bank and Digital (Sri Lanka days). Default: the current month.
export const getPaymentMethods = async (req, res, next) => {
  try {
    const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v));
    const pad = (n) => String(n).padStart(2, "0");
    let { from, to } = req.query;

    if (from || to) {
      if ((from && !isDate(from)) || (to && !isDate(to)) || (from && to && from > to))
        return res.status(400).json({ error: "Dates must be in YYYY-MM-DD format, from before to" });
    } else {
      const [cy, cm] = localDateStr().split("-").map(Number);
      const year = req.query.year ? Number(req.query.year) : cy;
      const month = req.query.month ? Number(req.query.month) : cm;
      if (
        !Number.isInteger(year) ||
        year < 2000 ||
        year > 2100 ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
      )
        return res.status(400).json({ error: "Invalid year / month" });
      from = `${year}-${pad(month)}-01`;
      to = addDays(month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`, -1);
    }

    let q = supabase
      .from("transactions")
      .select("transaction_type, payment_method, amount, category")
      .eq("user_id", req.user.id);
    if (from) q = q.gte("created_at", localDayStart(from).toISOString());
    if (to) q = q.lt("created_at", localDayStart(addDays(to, 1)).toISOString());
    const { data, error } = await q;
    if (error) throw error;

    res.json({ from: from || null, to: to || null, ...summarizeByMethod(data) });
  } catch (err) {
    next(err);
  }
};
