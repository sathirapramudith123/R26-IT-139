import { supabase } from "../config/supabase.js";
import { toClient, toClientList, up } from "../utils/mappers.js";
import { consumeStock, receiveStock, hasEnoughStock } from "../utils/stock.js";
import { buildJournal, journalTotals, buildGoodsSummary, buildProfitAndLoss } from "../utils/doubleEntry.js";
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
});

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
    const r = await consumeStock(userId, line.item_name, qty, reason);
    // store the actual FIFO cost (used by the reports)
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
    await receiveStock(userId, line.item_name, Number(line.quantity), cost, reason);
  }
}

// Undo the stock movement of an existing transaction
async function revertTransaction(userId, oldRow, reason) {
  const oldType = up(oldRow.transaction_type);
  for (const line of getItemList(oldRow)) {
    if (oldType === "SALE") {
      // sold units go back into stock (as a batch, at the stored cost)
      const cost = Number(line.cost_price ?? line.unit_price ?? 0);
      await receiveStock(userId, line.item_name, Number(line.quantity), cost, reason);
    } else if (oldType === "PURCHASE") {
      // purchased units are taken out again (FIFO)
      await consumeStock(userId, line.item_name, Number(line.quantity), reason);
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

    // Full rows (with items[]) for goods summary + P&L; light rows for journal
    const fullTxns = data || [];
    const txns = fullTxns.map((t) => ({
      id: t.transaction_id,
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
    });
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
