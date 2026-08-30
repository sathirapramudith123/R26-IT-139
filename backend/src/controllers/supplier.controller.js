import { supabase } from "../config/supabase.js";
import { toClient, up } from "../utils/mappers.js";

const TABLE = "suppliers";
const ID = "supplier_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));

// Accepts [{item_name, quantity, unit_price}] objects from the per-item
// form, and also tolerates the old plain string array (["Rice","Sugar"])
// shape from suppliers saved before this change — those just come back
// with quantity/unit_price at 0.
const toSuppliedItems = (v) => {
  if (!Array.isArray(v)) return [];
  return v
    .map((it) =>
      typeof it === "string"
        ? { item_name: it.trim(), quantity: 0, unit_price: 0 }
        : {
            item_name: String(it?.item_name ?? "").trim(),
            quantity: Number(it?.quantity) || 0,
            unit_price: Number(it?.unit_price) || 0,
          }
    )
    .filter((it) => it.item_name);
};

// lat/lng: keep null when not provided instead of forcing 0 (0,0 is a real
// point in the Gulf of Guinea — we don't want to silently save that).
const toCoord = (v) => (v === "" || v == null ? null : Number(v));

const toDb = (b) => ({
  supplier_name:      b.name || b.supplier_name,
  company_name:       b.company_name || null,
  contact_number:     b.contact_number,
  email:              b.email || null,
  // NOTE: `address` is intentionally not mapped here anymore — the form's
  // "Location" field (delivery_location) now captures the full address via
  // the map pin, so a separate free-text address is no longer collected.
  // Leaving this key out of toDb() means Supabase's .update() won't touch
  // whatever is already in that column (vs sending null and wiping it).
  delivery_location:  b.delivery_location || null,
  delivery_cost:      num(b.delivery_cost),
  available_quantity: num(b.available_quantity),          // derived client-side: sum of items_supplied quantities
  lead_time_days:     num(b.lead_time_days ?? 1),         // Procurement Optimization සඳහා
  items_supplied:     toSuppliedItems(b.items_supplied),  // ✅ [{item_name, quantity}] — JSONB
  latitude:           toCoord(b.latitude),                // ✅ අලුතින් එකතු කළා
  longitude:          toCoord(b.longitude),                // ✅ අලුතින් එකතු කළා
  // unit_price සහ supplier_status form එකෙන් තව එන්නෙ නෑ.
  // DB එකේ column දෙකම තාම තියෙනවා නම්, ඒවා default (0 / 'ACTIVE') විදිහට save වෙනවා.
});

const shape = (row) => {
  const c = toClient(row, ID);
  c.name = c.supplier_name;
  c.status = c.supplier_status;
  c.items_supplied = row.items_supplied || [];
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