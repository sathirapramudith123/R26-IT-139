import { supabase } from "../config/supabase.js";
import { toClient, toClientList, up } from "../utils/mappers.js";
import { consumeStock, receiveStock, hasEnoughStock } from "../utils/stock.js";
import {
  buildJournal,
  journalTotals,
  buildGoodsSummary,
  buildProfitAndLoss,
  buildLedger,
  openingBalances,
} from "../utils/doubleEntry.js";
import { localDayStart, localDateStr, addDays } from "../utils/time.js";

const TABLE = "transactions";
const ID = "transaction_id";
const numOrNull = (v) => (v === "" || v == null ? null : Number(v));

// Body -> Database format
const toDb = (b) => ({
  transaction_type: up(b.transaction_type),
  payment_method: up(b.payment_method),
  amount: Number(b.amount),
  category: b.category || null,
  description: b.description || null,
  item_name: b.item_name || null,
  quantity: numOrNull(b.quantity),
  // Cart / multiple items (JSONB), each with its cost_price snapshot
  items: Array.isArray(b.items) ? b.items : null,
  // Supplier Payment: who was paid (only sent when given, so the API keeps working before
  // the supplier_name column is added — see sql/schema.sql)
  ...(b.supplier_name && { supplier_name: String(b.supplier_name).trim() }),
});

// The supplier_name column is missing in this database: say how to add it
const missingSupplierColumn = (e) =>
  e && (e.code === "42703" || e.code === "PGRST204") && /supplier_name/.test(e.message || "");
const SUPPLIER_COLUMN_MSG =
  "Supplier payments need the supplier_name column. Run in the Supabase SQL editor: " +
  "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(150);";

// Lines as a list, from items[] or the single item columns
const getItemList = (record) => {
  if (record.items && Array.isArray(record.items) && record.items.length > 0) {
    return record.items;
  }
  if (record.item_name && record.quantity) {
    return [{ item_name: record.item_name, quantity: record.quantity }];
  }
  return [];
};

// On a SALE, compute FIFO COGS and store each line's actual cost in items[]
async function applySaleFifo(userId, txRow, reason) {
  let items = Array.isArray(txRow.items) ? [...txRow.items] : null;
  if (!items || !items.length) {
    // legacy single item
    for (const line of getItemList(txRow)) {
      await consumeStock(userId, line.item_name, Number(line.quantity), reason);
    }
    return;
  }
  for (let i = 0; i < items.length; i++) {
    const line = items[i];
    const qty = Number(line.quantity) || 0;
    // a line sold at a batch's own selling price comes out of that batch, the rest FIFO
    const r = await consumeStock(userId, line.item_name, qty, reason, line.unit_price);
    // store the actual cost of the units taken (used by the reports)
    items[i] = { ...line, cost_price: qty ? +(r.cogs / qty).toFixed(2) : 0 };
  }
  await supabase.from(TABLE).update({ items }).eq(ID, txRow.transaction_id).eq("user_id", userId);
  txRow.items = items;
}

// On a PURCHASE, receive the batch(es)
async function applyPurchase(userId, txRow, reason) {
  for (const line of getItemList(txRow)) {
    // A purchased batch costs the unit_price paid now. (The cost_price snapshot is the old
    // inventory cost at the time the item was picked, not the new batch's cost.)
    const cost = Number(line.unit_price ?? line.cost_price ?? 0);
    await receiveStock(userId, line.item_name, Number(line.quantity), cost, reason, line.selling_price);
  }
}

// Undo the stock movement of an existing transaction
async function revertTransaction(userId, oldRow, reason) {
  const oldType = up(oldRow.transaction_type);
  for (const line of getItemList(oldRow)) {
    if (oldType === "SALE") {
      // sold units go back into stock (as a batch, at the stored cost)
      // (back at the price they were sold for)
      const cost = Number(line.cost_price ?? line.unit_price ?? 0);
      await receiveStock(userId, line.item_name, Number(line.quantity), cost, reason, line.unit_price);
    } else if (oldType === "PURCHASE") {
      // purchased units are taken out again (from the batch with their selling price, then FIFO)
      await consumeStock(userId, line.item_name, Number(line.quantity), reason, line.selling_price);
    }
  }
}

// ── Double-entry Journal (DEAD CLIC) with date filtering ──────────────────
// GET /transactions/journal                → all, grouped by month
// GET /transactions/journal?year=2026&month=9   → that month's entries
// GET /transactions/journal?date=2026-09-15     → that day's entries
export const journal = async (req, res, next) => {
  try {
    const { year, month, date, from, to } = req.query;

    let q = supabase.from(TABLE).select("*").eq("user_id", req.user.id);

    // date-range filter (from-to) takes priority, then single day, then month
    // Day boundaries are Sri Lanka days (utils/time.js), whatever timezone the server runs in
    const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s));
    if ((from && !isDate(from)) || (to && !isDate(to)) || (date && !isDate(date)))
      return res.status(400).json({ error: "Dates must be in YYYY-MM-DD format" });

    if (from || to) {
      if (from) q = q.gte("created_at", localDayStart(from).toISOString());
      if (to) q = q.lt("created_at", localDayStart(addDays(to, 1)).toISOString());
    } else if (date) {
      q = q
        .gte("created_at", localDayStart(date).toISOString())
        .lt("created_at", localDayStart(addDays(date, 1)).toISOString());
    } else if (year && month) {
      const y = Number(year),
        m = Number(month);
      if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12)
        return res.status(400).json({ error: "Invalid year / month" });
      const first = `${y}-${String(m).padStart(2, "0")}-01`;
      const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      q = q
        .gte("created_at", localDayStart(first).toISOString())
        .lt("created_at", localDayStart(next).toISOString());
    }

    q = q.order("created_at", { ascending: true });
    const { data, error } = await q;
    if (error) throw error;

    // Ledger opening balances ("Balance b/d"): everything recorded before the period starts
    const startDay =
      from || date || (year && month ? `${Number(year)}-${String(Number(month)).padStart(2, "0")}-01` : null);
    let openings = {};
    let openingDate = null;
    if (startDay) {
      openingDate = localDayStart(startDay).toISOString();
      const { data: before, error: bErr } = await supabase
        .from(TABLE)
        .select("transaction_type, payment_method, amount, category")
        .eq("user_id", req.user.id)
        .lt("created_at", openingDate);
      if (bErr) throw bErr;
      openings = openingBalances(before);
    }

    // Full rows (with items[]) for goods summary + P&L; light rows for journal
    const fullTxns = data || [];
    const txns = fullTxns.map((t) => ({
      id: t.transaction_id,
      transaction_code: t.transaction_code,
      created_at: t.created_at,
      transaction_type: t.transaction_type,
      payment_method: t.payment_method,
      amount: t.amount,
      category: t.category,
      description: t.description,
    }));

    // Build double-entry journal rows (DR/CR) from the transactions
    const rows = buildJournal(txns);
    const totals = journalTotals(rows);

    // Goods movement summary (sold / bought) + Profit & Loss statement
    const goods = buildGoodsSummary(fullTxns);
    const profitLoss = buildProfitAndLoss(fullTxns);

    // Group by day for the drill-down UI
    const byDay = {};
    for (const r of rows) {
      const day = localDateStr(r.date); // Sri Lanka day
      (byDay[day] ||= []).push(r);
    }
    const days = Object.keys(byDay)
      .sort()
      .map((day) => ({
        date: day,
        entries: byDay[day],
        ...journalTotals(byDay[day]),
      }));

    // Available months (for the month picker) across ALL transactions
    let months = [];
    if (!year && !month && !date && !from && !to) {
      const monthSet = {};
      for (const t of txns) {
        const ym = localDateStr(t.created_at).slice(0, 7); // YYYY-MM (Sri Lanka)
        monthSet[ym] = (monthSet[ym] || 0) + 1;
      }
      months = Object.keys(monthSet)
        .sort()
        .reverse()
        .map((ym) => ({ month: ym, count: monthSet[ym] }));
    }

    res.json({
      filter:
        from || to
          ? { from, to }
          : date
            ? { date }
            : year && month
              ? { year: Number(year), month: Number(month) }
              : null,
      totals, // { total_debit, total_credit, balanced }
      entries: rows, // flat DR/CR rows
      days, // grouped by day (each with its own totals)
      months, // available months (only when no filter)
      goods, // { items:[{item, sold_qty, bought_qty, net_qty, ...}], totals }
      profit_loss: profitLoss, // Trading + P&L with account names
      ledger: buildLedger(rows, openings, openingDate), // per account: Balance b/d, debits[], credits[], balance
    });
  } catch (e) {
    next(e);
  }
};

// Price hints for the sale form, per item (key = lower-cased, trimmed name):
//   last_sale: the newest SALE line of the item { unit_price, cost_price, sold_at } — or null
//   batches:   batches still in stock, oldest first (FIFO) { quantity, selling_price, unit_cost }
// The form suggests the oldest batch's selling price (old stock keeps its old price / MRP), else the
// last sold price, and warns when the next batch costs more than the stock sold last time.
const priceKey = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const priceHints = async (req, res, next) => {
  try {
    const [sales, stock] = await Promise.all([
      supabase
        .from(TABLE)
        .select("items, item_name, quantity, amount, created_at")
        .eq("user_id", req.user.id)
        .eq("transaction_type", "SALE")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("inventory")
        .select("item_name, quantity, selling_price, cost_price, unit_price, received_at")
        .eq("user_id", req.user.id)
        .gt("quantity", 0)
        .order("received_at", { ascending: true }),
    ]);
    if (sales.error) throw sales.error;
    if (stock.error) throw stock.error;

    const hints = {};
    const entry = (name) => (hints[priceKey(name)] ??= { item_name: name, last_sale: null, batches: [] });

    for (const b of stock.data || []) {
      if (!priceKey(b.item_name)) continue;
      entry(b.item_name).batches.push({
        quantity: Number(b.quantity),
        selling_price: Number(b.selling_price) || 0,
        unit_cost: Number(b.cost_price ?? b.unit_price) || 0,
      });
    }
    for (const row of sales.data || []) {
      const lines = Array.isArray(row.items) && row.items.length ? row.items : [];
      if (!lines.length && row.item_name && Number(row.quantity) > 0)
        lines.push({ item_name: row.item_name, unit_price: Number(row.amount) / Number(row.quantity) });
      for (const l of lines) {
        const price = Number(l.unit_price);
        if (!priceKey(l.item_name) || !(price > 0)) continue;
        const h = entry(l.item_name);
        if (h.last_sale) continue; // newest first: keep the first one seen
        h.last_sale = {
          unit_price: +price.toFixed(2),
          cost_price: Number(l.cost_price) || 0,
          sold_at: row.created_at,
        };
      }
    }
    res.json(hints);
  } catch (e) {
    next(e);
  }
};

// 1. Get All
export const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(toClientList(data, ID));
  } catch (e) {
    next(e);
  }
};

// 2. Get One
export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Transaction not found" });
    res.json(toClient(data, ID));
  } catch (e) {
    next(e);
  }
};

// 3. Create
export const create = async (req, res, next) => {
  try {
    const payload = toDb(req.body);
    const type = payload.transaction_type;
    const isSale = type === "SALE";
    const isPurchase = type === "PURCHASE";

    // SALE — check that all batches together have enough stock
    if (isSale) {
      for (const item of getItemList(payload)) {
        const check = await hasEnoughStock(req.user.id, item.item_name, item.quantity);
        if (!check.ok) return res.status(400).json({ error: check.message });
      }
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ user_id: req.user.id, ...payload }])
      .select()
      .single();
    if (error) throw error;

    if (isSale) await applySaleFifo(req.user.id, data, "sold");
    else if (isPurchase) await applyPurchase(req.user.id, data, "purchased");

    res.status(201).json(toClient(data, ID));
  } catch (e) {
    if (missingSupplierColumn(e)) return res.status(400).json({ error: SUPPLIER_COLUMN_MSG });
    next(e);
  }
};

// 4. Update
export const update = async (req, res, next) => {
  try {
    const { data: old } = await supabase
      .from(TABLE)
      .select("*")
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (!old) return res.status(404).json({ error: "Transaction not found" });

    const payload = toDb(req.body);

    // 1) undo the old stock movement
    await revertTransaction(req.user.id, old, "edited (revert)");

    // 2) Record update
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .maybeSingle();
    if (error) throw error;

    // 3) apply the new stock movement
    const newType = up(data.transaction_type);
    if (newType === "SALE") await applySaleFifo(req.user.id, data, "sale edited (apply)");
    else if (newType === "PURCHASE") await applyPurchase(req.user.id, data, "purchase edited (apply)");

    res.json(toClient(data, ID));
  } catch (e) {
    if (missingSupplierColumn(e)) return res.status(400).json({ error: SUPPLIER_COLUMN_MSG });
    next(e);
  }
};

// 5. Delete
export const remove = async (req, res, next) => {
  try {
    const { data: old } = await supabase
      .from(TABLE)
      .select("*")
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (!old) return res.status(404).json({ error: "Transaction not found" });

    const { error } = await supabase.from(TABLE).delete().eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;

    // undo the deleted transaction's stock movement
    await revertTransaction(req.user.id, old, "deleted");

    res.json({ message: "Transaction deleted" });
  } catch (e) {
    next(e);
  }
};
