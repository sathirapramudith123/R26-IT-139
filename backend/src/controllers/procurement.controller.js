import { supabase } from "../config/supabase.js";
import { toClient, up } from "../utils/mappers.js";
import { notify } from "./notification.controller.js";
import { adjustStock } from "../utils/stock.js";

const TABLE = "procurement";
const ID = "procurement_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));

const toDb = (b) => ({
  item_name:              b.item_name,
  quantity:               Number(b.quantity),
  delivery_location:      b.delivery_location || null,
  expected_selling_price: num(b.expected_selling_price),
  selected_supplier_name: b.selected_supplier_name || null,
  total_cost:             num(b.total_cost),
  estimated_profit:       num(b.estimated_profit),
  procurement_status:     up(b.status || b.procurement_status || "pending"),
});

const shape = (row) => {
  const c = toClient(row, ID);
  c.status = c.procurement_status;
  return c;
};

// RECEIVED කරද්දි — total_cost ÷ quantity = unit cost එකට batch එකක් receive කරනවා
async function stockReceived(userId, item_name, quantity, totalCost) {
  const qty = Number(quantity) || 0;
  const unitCost = qty > 0 ? num(totalCost) / qty : 0;   // landed cost per unit
  await adjustStock(userId, item_name, qty, "procurement received", unitCost);
  await notify(userId, {
    title: "Stock received",
    message: `${quantity} of ${item_name} added to your inventory.`,
    type: "SUCCESS",
    category: "PROCUREMENT",
    link: "/dashboard/inventory",
  });
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
      await stockReceived(req.user.id, data.item_name, data.quantity, data.total_cost);
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

    // Scenario 1: Pending → Received (Add Stock)
    if (!wasReceived && nowReceived) {
      await stockReceived(req.user.id, data.item_name, data.quantity, data.total_cost);
    }
    // Scenario 2: Received → Pending/Cancelled (Reverse Stock — FIFO)
    else if (wasReceived && !nowReceived) {
      await adjustStock(req.user.id, old.item_name, -Number(old.quantity), "procurement reversed");
    }
    // Scenario 3: Received → Received (Quantity or Item changed while still RECEIVED)
    else if (wasReceived && nowReceived) {
      if (old.item_name !== data.item_name || Number(old.quantity) !== Number(data.quantity)) {
        // පරණ quantity එක reverse (FIFO)
        await adjustStock(req.user.id, old.item_name, -Number(old.quantity), "procurement updated (old)");
        // නව quantity එක නියම cost එකට add
        await stockReceived(req.user.id, data.item_name, data.quantity, data.total_cost);
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
      await adjustStock(req.user.id, old.item_name, -Number(old.quantity), "procurement deleted");
    }

    res.json({ message: "Record deleted" });
  } catch (e) { next(e); }
};