import { supabase } from "../config/supabase.js";
import { toClient, up } from "../utils/mappers.js";
import { notify } from "./notification.controller.js";

const TABLE = "agency_banking";
const ID = "agency_banking_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));

// CBSL per-transaction limits (LKR)
const LIMITS = {
  CASH_DEPOSIT: 500000,
  CASH_WITHDRAWAL: 200000,
  FUND_TRANSFER: 1000000,
  BALANCE_INQUIRY: null,
};

const toDb = (b) => ({
  customer_name:    b.customer_name,
  customer_phone:   b.customer_phone,
  transaction_type: up(b.transaction_type),
  amount:           Number(b.amount),
  service_fee:      num(b.service_fee),
  commission:       num(b.commission),
  created_offline:  Boolean(b.created_offline),
  banking_status:   up(b.status || b.banking_status || "completed"),
});

const shape = (row) => {
  const c = toClient(row, ID);
  c.status = c.banking_status;
  return c;
};

function checkLimit(payload) {
  const limit = LIMITS[payload.transaction_type];
  if (limit && payload.amount > limit)
    return `Amount exceeds the CBSL limit of LKR ${limit.toLocaleString()} for ${payload.transaction_type.replace(/_/g, " ").toLowerCase()}.`;
  return null;
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
    if (!data) return res.status(404).json({ error: "Transaction not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const payload = toDb(req.body);
    const err = checkLimit(payload);
    if (err) return res.status(400).json({ error: err });

    const { data, error } = await supabase
      .from(TABLE).insert([{ user_id: req.user.id, ...payload }])
      .select().single();
    if (error) throw error;

    await notify(req.user.id, {
      title: "Banking transaction posted",
      message: `${String(data.transaction_type).replace(/_/g, " ").toLowerCase()} of LKR ${data.amount} for ${data.customer_name}. Ref: ${data.reference_code}`,
      type: "SUCCESS",
      category: "BANKING",
      link: "/dashboard/agency-banking",
    });

    res.status(201).json(shape(data));
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const payload = toDb(req.body);
    const err = checkLimit(payload);
    if (err) return res.status(400).json({ error: err });

    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq(ID, req.params.id).eq("user_id", req.user.id)
      .select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Transaction not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from(TABLE).delete()
      .eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Transaction deleted" });
  } catch (e) { next(e); }
};