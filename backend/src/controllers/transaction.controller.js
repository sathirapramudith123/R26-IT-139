import { supabase } from "../config/supabase.js";
import { toClient, toClientList, up } from "../utils/mappers.js";
import { adjustStock, hasEnoughStock } from "../utils/stock.js";

const TABLE = "transactions";
const ID = "transaction_id";
const numOrNull = (v) => (v === "" || v == null ? null : Number(v));

const toDb = (b) => ({
  transaction_type: up(b.transaction_type),
  payment_method:   up(b.payment_method),
  amount:           Number(b.amount),
  category:         b.category || null,
  description:      b.description || null,
  item_name:        b.item_name || null,
  quantity:         numOrNull(b.quantity),
});

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

export const create = async (req, res, next) => {
  try {
    const payload = toDb(req.body);
    const isSale = payload.transaction_type === "SALE";

    if (isSale && payload.item_name && payload.quantity) {
      const check = await hasEnoughStock(req.user.id, payload.item_name, payload.quantity);
      if (!check.ok) return res.status(400).json({ error: check.message });
    }

    const { data, error } = await supabase
      .from(TABLE).insert([{ user_id: req.user.id, ...payload }])
      .select().single();
    if (error) throw error;

    
    if (isSale && data.item_name && data.quantity) {
      await adjustStock(req.user.id, data.item_name, -Number(data.quantity), "sold");
    }

    res.status(201).json(toClient(data, ID));
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { data: old } = await supabase
      .from(TABLE).select("*")
      .eq(ID, req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (!old) return res.status(404).json({ error: "Transaction not found" });

    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...toDb(req.body), updated_at: new Date().toISOString() })
      .eq(ID, req.params.id).eq("user_id", req.user.id)
      .select().maybeSingle();
    if (error) throw error;

    
    if (up(old.transaction_type) === "SALE" && old.item_name && old.quantity)
      await adjustStock(req.user.id, old.item_name, Number(old.quantity), "sale edited");
    if (data.transaction_type === "SALE" && data.item_name && data.quantity)
      await adjustStock(req.user.id, data.item_name, -Number(data.quantity), "sale edited");

    res.json(toClient(data, ID));
  } catch (e) { next(e); }
};

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

    
    if (up(old.transaction_type) === "SALE" && old.item_name && old.quantity)
      await adjustStock(req.user.id, old.item_name, Number(old.quantity), "sale deleted");

    res.json({ message: "Transaction deleted" });
  } catch (e) { next(e); }
};