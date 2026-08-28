import { supabase } from "../config/supabase.js";
import { toClient, up } from "../utils/mappers.js";
import { notify } from "./notification.controller.js";

const TABLE = "inventory";
const ID = "inventory_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));

const toDb = (b) => {
  const quantity = num(b.quantity);
  const reorder_level = num(b.reorder_level);
  const cost_price = num(b.cost_price ?? b.unit_price);

  return {
    item_name:      b.name || b.item_name,
    category:       b.category || "Other",
    supplier_name:  b.supplier_name || null,
    quantity,
    reorder_level,
    unit:           up(b.unit || "unit"),
    cost_price,
    unit_price:     cost_price,            // selling price අයින් — unit_price = cost
    lead_time_days: num(b.lead_time_days ?? 1),
    item_status:    quantity <= 0 ? "OUT_OF_STOCK"
                  : quantity <= reorder_level ? "RUNNING_OUT"
                  : "AVAILABLE",
  };
};

const shape = (row) => {
  const c = toClient(row, ID);
  c.name = c.item_name;
  c.cost_price = c.cost_price ?? c.unit_price;
  c.total_cost = num(c.cost_price) * num(c.quantity);
  return c;
};

// ── Batches -> item_name එකෙන් group කරලා combined view එකක් ──────────
// එකම item එකේ batches කිහිපයක් තිබුණත්, screen එකට එන්නෙ එක row එකක්:
//   quantity      = සියලු batches එකතුව
//   cost_price    = weighted average cost
//   cost_min/max  = cost range (batches වල අඩුම/වැඩිම)
//   total_cost    = සම්පූර්ණ stock එකේ වටිනාකම
const aggregateItems = (rows) => {
  const groups = {};
  for (const row of (rows || [])) {
    (groups[row.item_name] ||= []).push(row);
  }

  return Object.values(groups).map((batches) => {
    // FIFO order (received_at) — newest එක representative (id, meta වලට)
    batches.sort((a, b) => new Date(a.received_at || a.created_at) - new Date(b.received_at || b.created_at));
    const rep = batches[batches.length - 1];

    const total = batches.reduce((s, b) => s + num(b.quantity), 0);
    const totalCost = batches.reduce((s, b) => s + num(b.quantity) * num(b.cost_price ?? b.unit_price), 0);
    const avgCost = total > 0 ? totalCost / total : num(rep.cost_price ?? rep.unit_price);
    const reorder = num(rep.reorder_level);

    const liveCosts = batches.filter((b) => num(b.quantity) > 0).map((b) => num(b.cost_price ?? b.unit_price));

    const c = toClient(rep, ID);
    c.name = c.item_name;
    c.quantity = total;
    c.cost_price = +avgCost.toFixed(2);
    c.total_cost = +totalCost.toFixed(2);
    c.batch_count = batches.length;
    c.cost_min = liveCosts.length ? Math.min(...liveCosts) : c.cost_price;
    c.cost_max = liveCosts.length ? Math.max(...liveCosts) : c.cost_price;
    c.item_status = total <= 0 ? "OUT_OF_STOCK"
                  : total <= reorder ? "RUNNING_OUT"
                  : "AVAILABLE";
    return c;
  });
};

export const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*")
      .eq("user_id", req.user.id)
      .order("received_at", { ascending: true });
    if (error) throw error;
    res.json(aggregateItems(data));
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
    const all = aggregateItems(data);
    const running_out = all.filter((i) => Number(i.quantity) <= Number(i.reorder_level));
    res.json({ running_out, summary: { total: all.length, running_out: running_out.length } });
  } catch (e) { next(e); }
};

// Add Item — item එකක පළමු batch එක හදනවා
export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).insert([{ user_id: req.user.id, ...toDb(req.body) }])
      .select().single();
    if (error) throw error;

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
    if (error) throw error;
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