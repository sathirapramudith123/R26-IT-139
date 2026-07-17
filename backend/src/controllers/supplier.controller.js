import { supabase } from "../config/supabase.js";
import { toClient, up } from "../utils/mappers.js";

const TABLE = "suppliers";
const ID = "supplier_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));

const toDb = (b) => ({
  supplier_name:      b.name || b.supplier_name,
  company_name:       b.company_name || null,
  contact_number:     b.contact_number,
  email:              b.email || null,
  address:            b.address || null,
  unit_price:         num(b.unit_price),
  delivery_cost:      num(b.delivery_cost),
  available_quantity: num(b.available_quantity),
  supplier_status:    up(b.status || b.supplier_status || "active"),
});

const shape = (row) => {
  const c = toClient(row, ID);
  c.name = c.supplier_name;
  c.status = c.supplier_status;
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
    if (!data) return res.status(404).json({ error: "Supplier not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).insert([{ user_id: req.user.id, ...toDb(req.body) }])
      .select().single();
    if (error) throw error;
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
    if (!data) return res.status(404).json({ error: "Supplier not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from(TABLE).delete()
      .eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Supplier deleted" });
  } catch (e) { next(e); }
};