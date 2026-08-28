import { supabase } from "../config/supabase.js";
import { toClient } from "../utils/mappers.js";
import { topUpFloat, floatHealth, getBank } from "../utils/float.js";

const TABLE = "agent_banks";
const ID = "agent_bank_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));
const upTier = (v) => {
  const t = String(v || "LOW").toUpperCase();
  return ["LOW", "MEDIUM", "HIGH"].includes(t) ? t : "LOW";
};

const toDb = (b) => ({
  bank_name:      b.bank_name,
  bank_code:      b.bank_code || null,
  risk_tier:      upTier(b.risk_tier),
  float_balance:  num(b.float_balance),
  cash_on_hand:   num(b.cash_on_hand),
  float_floor:    num(b.float_floor) || 50000,
  float_ceiling:  num(b.float_ceiling) || 500000,
  alert_low_pct:  num(b.alert_low_pct) || 40,
  alert_crit_pct: num(b.alert_crit_pct) || 20,
  is_active:      b.is_active === undefined ? true : Boolean(b.is_active),
});

// health + utilization එක්ක client shape
const shape = (row) => {
  const c = toClient(row, ID);
  c.float_health = floatHealth(row);
  c.utilization_pct = num(row.float_floor) > 0
    ? +((num(row.float_balance) / num(row.float_floor)) * 100).toFixed(1)
    : null;
  return c;
};

export const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*").eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json((data || []).map(shape));
  } catch (e) { next(e); }
};

export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*").eq(ID, req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Bank not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).insert([{ user_id: req.user.id, ...toDb(req.body) }])
      .select().single();
    if (error) {
      if (error.code === "23505") return res.status(400).json({ error: "A bank with this name already exists." });
      throw error;
    }
    res.status(201).json(shape(data));
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).update({ ...toDb(req.body), updated_at: new Date().toISOString() })
      .eq(ID, req.params.id).eq("user_id", req.user.id).select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Bank not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from(TABLE).delete().eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Bank deleted" });
  } catch (e) { next(e); }
};

// POST /agent-banks/:id/topup  { amount }
// Agent physical cash -> float account (DR Float / CR Cash-on-Hand)
export const topup = async (req, res, next) => {
  try {
    const amount = num(req.body.amount);
    if (amount <= 0) return res.status(400).json({ error: "Enter a top-up amount greater than 0." });

    const bank = await getBank(req.user.id, req.params.id);
    if (!bank) return res.status(404).json({ error: "Bank not found" });

    const floatAfter = await topUpFloat(req.user.id, bank, amount);
    const updated = await getBank(req.user.id, req.params.id);
    res.json({ ...shape(updated), topped_up: amount, float_after: floatAfter });
  } catch (e) { next(e); }
};