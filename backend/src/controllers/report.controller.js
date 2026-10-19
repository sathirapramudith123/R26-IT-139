import { supabase } from "../config/supabase.js";
import { isDrawings, toJournalLines } from "../utils/doubleEntry.js";
import { summarizeByMethod } from "../utils/paymentMethods.js";
import { localDateStr, localDayStart, addDays } from "../utils/time.js";
import { getCashPool, floatHealth } from "../utils/float.js";

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

// GET /reports/cash-flow?from=YYYY-MM-DD&to=YYYY-MM-DD
//   shop   — the shop's Cash A/C (same journal lines as the Journal tab): opening balance, cash in /
//            out by kind, closing balance, and the entries of the period
//   agency — agency banking cash, kept apart from the shop's money (it is customers' money):
//            deposits received, withdrawals paid out, float top-ups and reversals for the period,
//            today's cash on hand and what is available, and each partner bank's float
const CASH = "Cash A/C";
const AGENT_CASH = "Agent Cash-on-Hand";
// how each float-ledger event moves the agent's cash on hand (atomic_banking.sql, _float_move)
const AGENT_CASH_SIGN = { DEPOSIT: 1, WITHDRAWAL: -1, TOPUP: -1, WITHDRAWAL_REVERSAL: 1, DEPOSIT_REVERSAL: -1 };

const cashKind = (t) => {
  const type = String(t.transaction_type || "").toLowerCase();
  if (type === "sale") return "Cash sales";
  if (type === "purchase") return "Cash purchases";
  if (type === "expense") return isDrawings(t.category) ? "Drawings" : "Expenses";
  if (type === "deposit") return "Deposited to bank";
  if (type === "transfer") return /supplier payment/i.test(t.category || "") ? "Supplier payments" : "Transfers";
  return "Other";
};

export const getCashFlow = async (req, res, next) => {
  try {
    const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v));
    const today = localDateStr();
    const from = isDate(req.query.from) ? req.query.from : `${today.slice(0, 8)}01`;
    const to = isDate(req.query.to) ? req.query.to : today;
    if (from > to) return res.status(400).json({ error: "from must be on or before to" });
    const start = localDayStart(from).getTime();
    const end = localDayStart(addDays(to, 1)).getTime();
    const userId = req.user.id;

    const [txRes, ledRes, bankRes, abRes, pool] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId).order("created_at"),
      supabase
        .from("agent_float_ledger")
        .select("agent_bank_id, agency_banking_id, event_type, amount, note, created_at")
        .eq("user_id", userId)
        .eq("gl_account", AGENT_CASH)
        .order("created_at"),
      supabase.from("agent_banks").select("*").eq("user_id", userId),
      supabase.from("agency_banking").select("agency_banking_id, customer_name, account_number").eq("user_id", userId),
      getCashPool(userId),
    ]);
    for (const r of [txRes, ledRes, bankRes, abRes]) if (r.error) throw r.error;

    // ---- shop Cash A/C ----
    let opening = 0;
    const cashIn = {};
    const cashOut = {};
    const entries = [];
    for (const t of txRes.data || []) {
      const l = toJournalLines(t);
      const signed = l.debit_account === CASH ? l.amount : l.credit_account === CASH ? -l.amount : 0;
      if (!signed) continue;
      const at = new Date(t.created_at).getTime();
      if (at < start) {
        opening += signed;
        continue;
      }
      if (at >= end) continue;
      const kind = cashKind(t);
      if (signed > 0) cashIn[kind] = (cashIn[kind] || 0) + signed;
      else cashOut[kind] = (cashOut[kind] || 0) - signed;
      entries.push({ date: t.created_at, kind, note: t.category || t.description || "", amount: signed });
    }
    const totalIn = Object.values(cashIn).reduce((a, b) => a + b, 0);
    const totalOut = Object.values(cashOut).reduce((a, b) => a + b, 0);
    let running = opening;
    for (const e of entries) e.balance = running += e.amount;

    // ---- agency banking cash (separate) ----
    const banks = bankRes.data || [];
    const bankName = Object.fromEntries(banks.map((b) => [b.agent_bank_id, b.bank_name]));
    const customer = Object.fromEntries((abRes.data || []).map((a) => [a.agency_banking_id, a]));
    const totals = { DEPOSIT: 0, WITHDRAWAL: 0, TOPUP: 0, WITHDRAWAL_REVERSAL: 0, DEPOSIT_REVERSAL: 0 };
    const agencyEntries = [];
    const todayStart = localDayStart(today).getTime();
    let todayNet = 0;
    for (const r of ledRes.data || []) {
      const sign = AGENT_CASH_SIGN[r.event_type];
      if (!sign) continue;
      const at = new Date(r.created_at).getTime();
      const amount = Number(r.amount) || 0;
      if (at >= todayStart) todayNet += sign * amount;
      if (at < start || at >= end) continue;
      totals[r.event_type] += amount;
      const c = customer[r.agency_banking_id];
      agencyEntries.push({
        date: r.created_at,
        event: r.event_type,
        bank: bankName[r.agent_bank_id] || "",
        customer: c?.customer_name || "",
        account: c?.account_number || "",
        note: r.note || "",
        amount: sign * amount,
      });
    }
    const cashOnHand = Number(pool.cash_on_hand) || 0;
    const reserve = Number(pool.reserve_floor) || 0;
    const dayStart = Number(pool.day_start_cash) || 0;

    res.json({
      from,
      to,
      shop: {
        opening,
        cash_in: cashIn,
        cash_out: cashOut,
        total_in: totalIn,
        total_out: totalOut,
        net: totalIn - totalOut,
        closing: opening + totalIn - totalOut,
        entries,
      },
      agency: {
        period: {
          deposits: totals.DEPOSIT,
          withdrawals: totals.WITHDRAWAL,
          float_topups: totals.TOPUP,
          reversals_in: totals.WITHDRAWAL_REVERSAL,
          reversals_out: totals.DEPOSIT_REVERSAL,
          net:
            totals.DEPOSIT - totals.WITHDRAWAL - totals.TOPUP + totals.WITHDRAWAL_REVERSAL - totals.DEPOSIT_REVERSAL,
          entries: agencyEntries,
        },
        today: {
          day_start_cash: dayStart,
          movements: todayNet,
          // cash added to the pool by the agent is not in the float ledger
          other: cashOnHand - dayStart - todayNet,
          cash_on_hand: cashOnHand,
          reserve_floor: reserve,
          available_for_withdrawals: cashOnHand,
          available_for_topup: Math.max(0, cashOnHand - reserve),
        },
        banks: banks.map((b) => ({
          id: b.agent_bank_id,
          bank_name: b.bank_name,
          float_balance: Number(b.float_balance) || 0,
          float_floor: Number(b.float_floor) || 0,
          float_ceiling: Number(b.float_ceiling) || 0,
          health: floatHealth(b),
          // a deposit takes the float down by its amount, so the whole float is available for deposits
          available_for_deposits: Math.max(0, Number(b.float_balance) || 0),
        })),
        total_float: banks.reduce((a, b) => a + (Number(b.float_balance) || 0), 0),
      },
    });
  } catch (err) {
    next(err);
  }
};
