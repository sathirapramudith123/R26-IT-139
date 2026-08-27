import { supabase } from "../config/supabase.js";
import { toClient, toClientList, up } from "../utils/mappers.js";
import { consumeStock, receiveStock, hasEnoughStock } from "../utils/stock.js";

const TABLE = "transactions";
const ID = "transaction_id";
const numOrNull = (v) => (v === "" || v == null ? null : Number(v));

// Body -> Database format
const toDb = (b) => ({
  transaction_type: up(b.transaction_type),
  payment_method:   up(b.payment_method),
  amount:           Number(b.amount),
  category:         b.category || null,
  description:      b.description || null,
  item_name:        b.item_name || null,
  quantity:         numOrNull(b.quantity),
  // Cart / multiple items (JSONB) — cost_price snapshot එකත් මෙතන එනවා
  items:            Array.isArray(b.items) ? b.items : null,
});

// Single item හෝ items[] array එකක් විදිහට ලබා ගැනීම
const getItemList = (record) => {
  if (record.items && Array.isArray(record.items) && record.items.length > 0) {
    return record.items;
  }
  if (record.item_name && record.quantity) {
    return [{ item_name: record.item_name, quantity: record.quantity }];
  }
  return [];
};

// SALE එකකදි FIFO COGS එක ගණන් හදලා items[] එකේ cost_price update කිරීම
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
    // FIFO වලින් ආපු නියම cost එක store කරනවා (report එකට)
    items[i] = { ...line, cost_price: qty ? +(r.cogs / qty).toFixed(2) : 0 };
  }
  await supabase.from(TABLE).update({ items }).eq(ID, txRow.transaction_id).eq("user_id", userId);
  txRow.items = items;
}

// PURCHASE එකකදි batch(es) receive කිරීම
async function applyPurchase(userId, txRow, reason) {
  for (const line of getItemList(txRow)) {
    // PURCHASE එකකදි batch cost = දැන් ගෙවන unit_price එක.
    // (cost_price snapshot එක item pick කරපු වෙලාවෙ තිබුණු පරණ inventory cost එක —
    //  ඒක අලුත් batch එකේ cost එක නෙවෙයි.)
    const cost = Number(line.unit_price ?? line.cost_price ?? 0);
    await receiveStock(userId, line.item_name, Number(line.quantity), cost, reason);
  }
}

// පැරණි transaction එකක stock adjustment එක revert කිරීම
async function revertTransaction(userId, oldRow, reason) {
  const oldType = up(oldRow.transaction_type);
  for (const line of getItemList(oldRow)) {
    if (oldType === "SALE") {
      // විකුණපු ඒවා ආපහු stock එකට (batch එකක් විදිහට, ගබඩා කරපු cost එකට)
      const cost = Number(line.cost_price ?? line.unit_price ?? 0);
      await receiveStock(userId, line.item_name, Number(line.quantity), cost, reason);
    } else if (oldType === "PURCHASE") {
      // ගත්ත ඒවා ආපහු අඩු කිරීම (FIFO)
      await consumeStock(userId, line.item_name, Number(line.quantity), reason);
    }
  }
}

// 1. Get All
export const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(toClientList(data, ID));
  } catch (e) { next(e); }
};

// 2. Get One
export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*")
      .eq(ID, req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Transaction not found" });
    res.json(toClient(data, ID));
  } catch (e) { next(e); }
};

// 3. Create
export const create = async (req, res, next) => {
  try {
    const payload = toDb(req.body);
    const type = payload.transaction_type;
    const isSale = type === "SALE";
    const isPurchase = type === "PURCHASE";

    // SALE — සියලු batches එකතුව ප්‍රමාණවත්ද කියලා check කිරීම
    if (isSale) {
      for (const item of getItemList(payload)) {
        const check = await hasEnoughStock(req.user.id, item.item_name, item.quantity);
        if (!check.ok) return res.status(400).json({ error: check.message });
      }
    }

    const { data, error } = await supabase
      .from(TABLE).insert([{ user_id: req.user.id, ...payload }]).select().single();
    if (error) throw error;

    if (isSale) await applySaleFifo(req.user.id, data, "sold");
    else if (isPurchase) await applyPurchase(req.user.id, data, "purchased");

    res.status(201).json(toClient(data, ID));
  } catch (e) { next(e); }
};

// 4. Update
export const update = async (req, res, next) => {
  try {
    const { data: old } = await supabase
      .from(TABLE).select("*")
      .eq(ID, req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (!old) return res.status(404).json({ error: "Transaction not found" });

    const payload = toDb(req.body);

    // 1) පැරණි stock adjustments revert
    await revertTransaction(req.user.id, old, "edited (revert)");

    // 2) Record update
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq(ID, req.params.id).eq("user_id", req.user.id).select().maybeSingle();
    if (error) throw error;

    // 3) නව stock adjustments apply
    const newType = up(data.transaction_type);
    if (newType === "SALE") await applySaleFifo(req.user.id, data, "sale edited (apply)");
    else if (newType === "PURCHASE") await applyPurchase(req.user.id, data, "purchase edited (apply)");

    res.json(toClient(data, ID));
  } catch (e) { next(e); }
};

// 5. Delete
export const remove = async (req, res, next) => {
  try {
    const { data: old } = await supabase
      .from(TABLE).select("*")
      .eq(ID, req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (!old) return res.status(404).json({ error: "Transaction not found" });

    const { error } = await supabase
      .from(TABLE).delete()
      .eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;

    // මකා දැමූ transaction එකේ stock එක revert
    await revertTransaction(req.user.id, old, "deleted");

    res.json({ message: "Transaction deleted" });
  } catch (e) { next(e); }
};