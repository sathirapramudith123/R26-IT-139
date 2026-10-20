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
          },
    )
    .filter((it) => it.item_name);
};

// lat/lng: keep null when not provided instead of forcing 0 (0,0 is a real
// point in the Gulf of Guinea — we don't want to silently save that).
const toCoord = (v) => (v === "" || v == null ? null : Number(v));

// Trim the text fields and collapse repeated spaces, so "Dulmi " and "Dulmi" are the same supplier
// (inventory, procurement and supplier payments match suppliers by name).
const clean = (v) => (v == null ? v : String(v).replace(/\s+/g, " ").trim());

const toDb = (b) => ({
  supplier_name: clean(b.name || b.supplier_name),
  company_name: clean(b.company_name) || null,
  contact_number: clean(b.contact_number),
  email: clean(b.email) || null,
  // NOTE: `address` is intentionally not mapped here anymore — the form's
  // "Location" field (delivery_location) now captures the full address via
  // the map pin, so a separate free-text address is no longer collected.
  // Leaving this key out of toDb() means Supabase's .update() won't touch
  // whatever is already in that column (vs sending null and wiping it).
  delivery_location: clean(b.delivery_location) || null,
  delivery_cost: num(b.delivery_cost),
  available_quantity: num(b.available_quantity), // derived client-side: sum of items_supplied quantities
  lead_time_days: num(b.lead_time_days ?? 1), // used for procurement lead time
  items_supplied: toSuppliedItems(b.items_supplied), // [{item_name, quantity}] — JSONB
  latitude: toCoord(b.latitude), // map pin
  longitude: toCoord(b.longitude), // map pin
  // unit_price and supplier_status are not sent by the form; the DB defaults (0 / 'ACTIVE') apply.
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
      .from(TABLE)
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json((data || []).map(shape));
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Supplier not found" });
    res.json(shape(data));
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ user_id: req.user.id, ...toDb(req.body) }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(shape(data));
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...toDb(req.body), updated_at: new Date().toISOString() })
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Supplier not found" });
    res.json(shape(data));
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { error } = await supabase.from(TABLE).delete().eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Supplier deleted" });
  } catch (e) {
    next(e);
  }
};

// What the shop owes each supplier: received procurement orders minus Supplier Payments to them.
//   received    = total cost of RECEIVED orders (goods delivered)
//   on_order    = total cost of ORDERED orders (not delivered yet, not owed yet)
//   paid        = Supplier Payment transactions recorded for the supplier
//   outstanding = received - paid (negative = paid in advance)
// payments_tracked is false until the transactions.supplier_name column exists (sql/schema.sql).
export const balances = async (req, res, next) => {
  try {
    const uid = req.user.id;
    const key = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    const [sup, orders, pays] = await Promise.all([
      supabase.from(TABLE).select("supplier_name").eq("user_id", uid),
      supabase
        .from("procurement")
        .select("selected_supplier_name, total_cost, procurement_status, updated_at")
        .eq("user_id", uid),
      supabase
        .from("transactions")
        .select("supplier_name, amount, created_at")
        .eq("user_id", uid)
        .eq("category", "Supplier Payment"),
    ]);
    if (sup.error) throw sup.error;
    if (orders.error) throw orders.error;
    const tracked = !pays.error;
    if (pays.error && !(pays.error.code === "42703" || /supplier_name/.test(pays.error.message || "")))
      throw pays.error;

    const out = {};
    const row = (name) =>
      (out[key(name)] ??= {
        supplier_name: String(name).trim(),
        received: 0,
        on_order: 0,
        paid: 0,
        last_payment_at: null,
      });
    for (const s of sup.data || []) if (key(s.supplier_name)) row(s.supplier_name);
    for (const o of orders.data || []) {
      if (!key(o.selected_supplier_name)) continue;
      const status = String(o.procurement_status || "").toUpperCase();
      if (status === "RECEIVED") row(o.selected_supplier_name).received += Number(o.total_cost) || 0;
      else if (status === "ORDERED") row(o.selected_supplier_name).on_order += Number(o.total_cost) || 0;
    }
    for (const t of (tracked && pays.data) || []) {
      if (!key(t.supplier_name)) continue;
      const r = row(t.supplier_name);
      r.paid += Number(t.amount) || 0;
      if (!r.last_payment_at || t.created_at > r.last_payment_at) r.last_payment_at = t.created_at;
    }
    const list = Object.values(out)
      .map((r) => ({
        ...r,
        received: +r.received.toFixed(2),
        on_order: +r.on_order.toFixed(2),
        paid: +r.paid.toFixed(2),
        outstanding: +(r.received - r.paid).toFixed(2),
      }))
      .sort((a, b) => b.outstanding - a.outstanding || a.supplier_name.localeCompare(b.supplier_name));
    res.json({ payments_tracked: tracked, suppliers: list });
  } catch (e) {
    next(e);
  }
};
