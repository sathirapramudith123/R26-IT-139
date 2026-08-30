import { supabase } from "../config/supabase.js";
import { toClient, up } from "../utils/mappers.js";
import { notify } from "./notification.controller.js";
import { receiveStock, consumeStock } from "../utils/stock.js";

const TABLE = "procurement";
const ID = "procurement_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));

// items[] එකෙන් හෝ legacy single item එකෙන් line list එකක්
const getItemList = (record) => {
  if (Array.isArray(record.items) && record.items.length) return record.items;
  if (record.item_name && record.quantity) {
    const qty = num(record.quantity);
    const unitCost = qty > 0 ? num(record.total_cost) / qty : 0;
    return [{ item_name: record.item_name, quantity: qty, unit_cost: unitCost }];
  }
  return [];
};

const lineCost = (l) => num(l.unit_cost ?? l.cost_price);

const toDb = (b) => {
  const items = Array.isArray(b.items) ? b.items : null;
  const total = items
    ? items.reduce((s, it) => s + num(it.quantity) * lineCost(it), 0)
    : num(b.total_cost);

  return {
    procurement_no:         b.procurement_no || null,
    order_date:             b.date || b.order_date || null,
    item_name:              b.item_name || null,          // legacy (nullable)
    quantity:               b.quantity != null && b.quantity !== "" ? Number(b.quantity) : null,
    items,                                                // JSONB multi-item
    delivery_location:      b.delivery_location || null,
    coords:                 b.coords || null,
    arrival_date:           b.arrival_date || null,
    special_note:           b.special_note || null,
    expected_selling_price: num(b.expected_selling_price),
    selected_supplier_name: b.selected_supplier_name || b.supplier_name || null,
    total_cost:             total,
    estimated_profit:       num(b.estimated_profit),
    procurement_status:     up(b.status || b.procurement_status || "pending"),
  };
};

const shape = (row) => {
  const c = toClient(row, ID);
  c.status = c.procurement_status;

  // ✅ Multi-item records store everything in items[] (JSONB) and leave the
  // legacy item_name/quantity columns null — which made the Procurement list
  // page show blank "—" cells. Derive a display summary from items[] here
  // instead, so the list/table always has something sensible to show.
  const lines = Array.isArray(row.items) ? row.items : [];
  if (lines.length) {
    c.item_name = lines.length === 1
      ? lines[0].item_name
      : `${lines[0].item_name} +${lines.length - 1} more`;
    c.quantity = lines.reduce((s, l) => s + num(l.quantity), 0);
  }

  return c;
};

// RECEIVED → item එකින් එක නියම cost එකට batch එකක් receive කිරීම (FIFO system)
async function receiveAll(userId, record, reason) {
  const lines = getItemList(record);
  for (const line of lines) {
    const qty = num(line.quantity);
    if (qty <= 0) continue;
    await receiveStock(userId, line.item_name, qty, lineCost(line), reason);
  }
  if (lines.length) {
    await notify(userId, {
      title: "Stock received",
      message: `${lines.length} item(s) added to your inventory from procurement.`,
      type: "SUCCESS",
      category: "PROCUREMENT",
      link: "/dashboard/inventory",
    });
  }
}

// RECEIVED එකක් revert (pending/cancelled ට හෝ delete) → FIFO consume
async function revertAll(userId, record, reason) {
  for (const line of getItemList(record)) {
    const qty = num(line.quantity);
    if (qty <= 0) continue;
    await consumeStock(userId, line.item_name, qty, reason);
  }
}

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
    if (!data) return res.status(404).json({ error: "Record not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).insert([{ user_id: req.user.id, ...toDb(req.body) }])
      .select().single();
    if (error) throw error;

    if (data.procurement_status === "RECEIVED") {
      await receiveAll(req.user.id, data, "procurement received");
    }

    res.status(201).json(shape(data));
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { data: old } = await supabase
      .from(TABLE).select("*")
      .eq(ID, req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (!old) return res.status(404).json({ error: "Record not found" });

    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...toDb(req.body), updated_at: new Date().toISOString() })
      .eq(ID, req.params.id).eq("user_id", req.user.id)
      .select().maybeSingle();
    if (error) throw error;

    const wasReceived = old.procurement_status === "RECEIVED";
    const nowReceived = data.procurement_status === "RECEIVED";

    // 1. Pending → Received : batches receive
    if (!wasReceived && nowReceived) {
      await receiveAll(req.user.id, data, "procurement received");
    }
    // 2. Received → Pending/Cancelled : revert (FIFO consume)
    else if (wasReceived && !nowReceived) {
      await revertAll(req.user.id, old, "procurement reversed");
    }
    // 3. Received → Received & items වෙනස් : පරණ revert + නව receive
    else if (wasReceived && nowReceived) {
      const changed = JSON.stringify(getItemList(old)) !== JSON.stringify(getItemList(data));
      if (changed) {
        await revertAll(req.user.id, old, "procurement updated (revert)");
        await receiveAll(req.user.id, data, "procurement updated (apply)");
      }
    }

    res.json(shape(data));
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const { data: old } = await supabase
      .from(TABLE).select("*")
      .eq(ID, req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (!old) return res.status(404).json({ error: "Record not found" });

    const { error } = await supabase
      .from(TABLE).delete()
      .eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;

    if (old.procurement_status === "RECEIVED") {
      await revertAll(req.user.id, old, "procurement deleted");
    }

    res.json({ message: "Record deleted" });
  } catch (e) { next(e); }
};