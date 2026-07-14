import { supabase } from "../config/supabase.js";
import { toClient, up } from "../utils/mappers.js";
import { notify } from "./notification.controller.js";

const TABLE = "inventory";
const ID = "inventory_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));

const toDb = (b) => {
  const quantity = num(b.quantity);
  const reorder_level = num(b.reorder_level);
  return {
    item_name:     b.name || b.item_name,
    supplier_name: b.supplier_name || null,
    quantity,
    reorder_level,
    unit:          up(b.unit || "unit"),
    unit_price:    num(b.unit_price),
    item_status:   quantity <= 0 ? "OUT_OF_STOCK"
                 : quantity <= reorder_level ? "RUNNING_OUT"
                 : "AVAILABLE",
  };
};

const shape = (row) => {
  const c = toClient(row, ID);
  c.name = c.item_name;
  return c;
};

export const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json((data || []).map(shape));
  } catch (e) { next(e); }
};

export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*")
      .eq(ID, req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Item not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const status = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*").eq("user_id", req.user.id);
    if (error) throw error;
    const all = (data || []).map(shape);
    const running_out = all.filter((i) => Number(i.quantity) <= Number(i.reorder_level));
    res.json({ running_out, summary: { total: all.length, running_out: running_out.length } });
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).insert([{ user_id: req.user.id, ...toDb(req.body) }])
      .select().single();
    if (error) {
      if (error.code === "23505")
        return res.status(409).json({ error: "You already have an item with that name." });
      throw error;
    }

    if (Number(data.quantity) <= Number(data.reorder_level)) {
      await notify(req.user.id, {
        title: "Low stock alert",
        message: `${data.item_name} was added at ${data.quantity} — already at or below its reorder level.`,
        type: "WARNING",
        category: "INVENTORY",
        link: "/dashboard/inventory/alerts",
      });
    }

    res.status(201).json(shape(data));
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...toDb(req.body), updated_at: new Date().toISOString() })
      .eq(ID, req.params.id).eq("user_id", req.user.id)
      .select().maybeSingle();
    if (error) {
      if (error.code === "23505")
        return res.status(409).json({ error: "You already have an item with that name." });
      throw error;
    }
    if (!data) return res.status(404).json({ error: "Item not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from(TABLE).delete()
      .eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Item deleted" });
  } catch (e) { next(e); }
};