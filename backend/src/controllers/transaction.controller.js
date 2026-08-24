import { supabase } from "../config/supabase.js";
import { toClient, toClientList, up } from "../utils/mappers.js";
import { adjustStock, hasEnoughStock } from "../utils/stock.js";

const TABLE = "transactions";
const ID = "transaction_id";
const numOrNull = (v) => (v === "" || v == null ? null : Number(v));

// Body එකෙන් පැමිණෙන Data, Database එකට ගැලපෙන ලෙස Format කිරීම
const toDb = (b) => ({
  transaction_type: up(b.transaction_type),
  payment_method:   up(b.payment_method),
  amount:           Number(b.amount),
  category:         b.category || null,
  description:      b.description || null,
  item_name:        b.item_name || null,
  quantity:         numOrNull(b.quantity),
  // Cart/Multiple items සදහා JSON array support එක ලබා දීම (JSONB Column)
  items:            Array.isArray(b.items) ? b.items : null,
});

// Helper Function: Multiple items හෝ Single item එක array එකක් ලෙස ලබා ගැනීම
const getItemList = (record) => {
  if (record.items && Array.isArray(record.items) && record.items.length > 0) {
    return record.items;
  }
  if (record.item_name && record.quantity) {
    return [{ item_name: record.item_name, quantity: record.quantity }];
  }
  return [];
};

// 1. Get All Transactions
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

// 2. Get Single Transaction
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

// 3. Create Transaction
export const create = async (req, res, next) => {
  try {
    const payload = toDb(req.body);
    const isSale = payload.transaction_type === "SALE";
    const isPurchase = payload.transaction_type === "PURCHASE";
    const itemList = getItemList(payload);

    // SALE එකක් නම් සියලුම items වලට ප්‍රමාණවත් stock තිබේදැයි පරීක්ෂා කිරීම
    if (isSale) {
      for (const item of itemList) {
        const check = await hasEnoughStock(req.user.id, item.item_name, item.quantity);
        if (!check.ok) {
          return res.status(400).json({ error: check.message });
        }
      }
    }

    // Database එකට insert කිරීම
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ user_id: req.user.id, ...payload }])
      .select()
      .single();

    if (error) throw error;

    // Item අනුව Stock Update කිරීම (Sale -> (-) / Purchase -> (+))
    for (const item of itemList) {
      if (isSale) {
        await adjustStock(req.user.id, item.item_name, -Number(item.quantity), "sold");
      } else if (isPurchase) {
        await adjustStock(req.user.id, item.item_name, Number(item.quantity), "purchased");
      }
    }

    res.status(201).json(toClient(data, ID));
  } catch (e) {
    next(e);
  }
};

// 4. Update Transaction
export const update = async (req, res, next) => {
  try {
    // පැරණි Record එක ලබා ගැනීම
    const { data: old } = await supabase
      .from(TABLE)
      .select("*")
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (!old) return res.status(404).json({ error: "Transaction not found" });

    const payload = toDb(req.body);

    // Record එක Update කිරීම
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .maybeSingle();

    if (error) throw error;

    // පැරණි Stock Adjustments ඉවත් කිරීම (Revert Old Stock)
    const oldItems = getItemList(old);
    for (const item of oldItems) {
      if (up(old.transaction_type) === "SALE") {
        await adjustStock(req.user.id, item.item_name, Number(item.quantity), "sale edited (revert)");
      } else if (up(old.transaction_type) === "PURCHASE") {
        await adjustStock(req.user.id, item.item_name, -Number(item.quantity), "purchase edited (revert)");
      }
    }

    // නව Data වලට අදාළව Stock Adjustments යෙදීම (Apply New Stock)
    const newItems = getItemList(data);
    for (const item of newItems) {
      if (data.transaction_type === "SALE") {
        await adjustStock(req.user.id, item.item_name, -Number(item.quantity), "sale edited (apply)");
      } else if (data.transaction_type === "PURCHASE") {
        await adjustStock(req.user.id, item.item_name, Number(item.quantity), "purchase edited (apply)");
      }
    }

    res.json(toClient(data, ID));
  } catch (e) {
    next(e);
  }
};

// 5. Delete Transaction
export const remove = async (req, res, next) => {
  try {
    // මකා දැමීමට පෙර පැරණි Data ලබා ගැනීම
    const { data: old } = await supabase
      .from(TABLE)
      .select("*")
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (!old) return res.status(404).json({ error: "Transaction not found" });

    // Transaction එක මකා දැමීම
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id);

    if (error) throw error;

    // මකා දැමූ Transaction එකට අදාළව Stock Revert කිරීම
    const oldItems = getItemList(old);
    for (const item of oldItems) {
      if (up(old.transaction_type) === "SALE") {
        await adjustStock(req.user.id, item.item_name, Number(item.quantity), "sale deleted");
      } else if (up(old.transaction_type) === "PURCHASE") {
        await adjustStock(req.user.id, item.item_name, -Number(item.quantity), "purchase deleted");
      }
    }

    res.json({ message: "Transaction deleted" });
  } catch (e) {
    next(e);
  }
};