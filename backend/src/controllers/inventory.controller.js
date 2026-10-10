import { supabase } from "../config/supabase.js";
import { toClient, up } from "../utils/mappers.js";
import { notify } from "./notification.controller.js";
import { addDays, localDateStr, localDayStart } from "../utils/time.js";

const TABLE = "inventory";
const ID = "inventory_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));

const toDb = (b) => {
  const quantity = num(b.quantity);
  const reorder_level = num(b.reorder_level);
  const cost_price = num(b.cost_price ?? b.unit_price);

  return {
    item_name: b.name || b.item_name,
    category: b.category || "Other",
    supplier_name: b.supplier_name || null,
    quantity,
    reorder_level,
    unit: up(b.unit || "unit"),
    cost_price,
    unit_price: cost_price, // no separate selling price: unit_price = cost
    lead_time_days: num(b.lead_time_days ?? 1),
    item_status: quantity <= 0 ? "OUT_OF_STOCK" : quantity <= reorder_level ? "RUNNING_OUT" : "AVAILABLE",
  };
};

const shape = (row) => {
  const c = toClient(row, ID);
  c.name = c.item_name;
  c.cost_price = c.cost_price ?? c.unit_price;
  c.total_cost = num(c.cost_price) * num(c.quantity);
  return c;
};

// ── Batches grouped by item_name into one combined row per item ──────────
// An item with several batches is shown as a single row:
//   quantity      = sum of all batches
//   cost_price    = weighted average cost
//   cost_min/max  = cost range (lowest / highest batch cost)
//   total_cost    = value of the whole stock
const aggregateItems = (rows) => {
  const groups = {};
  for (const row of rows || []) {
    (groups[row.item_name] ||= []).push(row);
  }

  return Object.values(groups).map((batches) => {
    // FIFO order (received_at); the newest batch represents the item (id, metadata)
    batches.sort((a, b) => new Date(a.received_at || a.created_at) - new Date(b.received_at || b.created_at));
    const rep = batches[batches.length - 1];

    const total = batches.reduce((s, b) => s + num(b.quantity), 0);
    const totalCost = batches.reduce((s, b) => s + num(b.quantity) * num(b.cost_price ?? b.unit_price), 0);
    const avgCost = total > 0 ? totalCost / total : num(rep.cost_price ?? rep.unit_price);
    const reorder = num(rep.reorder_level);

    const liveCosts = batches
      .filter((b) => num(b.quantity) > 0)
      .map((b) => num(b.cost_price ?? b.unit_price));

    const c = toClient(rep, ID);
    c.name = c.item_name;
    c.quantity = total;
    c.cost_price = +avgCost.toFixed(2);
    c.total_cost = +totalCost.toFixed(2);
    c.batch_count = batches.length;
    c.cost_min = liveCosts.length ? Math.min(...liveCosts) : c.cost_price;
    c.cost_max = liveCosts.length ? Math.max(...liveCosts) : c.cost_price;
    c.item_status = total <= 0 ? "OUT_OF_STOCK" : total <= reorder ? "RUNNING_OUT" : "AVAILABLE";
    return c;
  });
};

export const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", req.user.id)
      .order("received_at", { ascending: true });
    if (error) throw error;
    res.json(aggregateItems(data));
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
    if (!data) return res.status(404).json({ error: "Item not found" });
    res.json(shape(data));
  } catch (e) {
    next(e);
  }
};

export const status = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from(TABLE).select("*").eq("user_id", req.user.id);
    if (error) throw error;
    const all = aggregateItems(data);
    const running_out = all.filter((i) => Number(i.quantity) <= Number(i.reorder_level));
    res.json({ running_out, summary: { total: all.length, running_out: running_out.length } });
  } catch (e) {
    next(e);
  }
};

// Add Item — creates the item's first batch
export const create = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ user_id: req.user.id, ...toDb(req.body) }])
      .select()
      .single();
    if (error) throw error;

    if (Number(data.quantity) <= Number(data.reorder_level)) {
      await notify(req.user.id, {
        title: "Low stock alert",
        message: `${data.item_name} was added at ${data.quantity} — already at or below its reorder level.`,
        type: "WARNING",
        category: "INVENTORY",
        link: "/dashboard/inventory/alerts",
        details: [
          ["Item", data.item_name],
          ["Stock now", `${data.quantity} ${data.unit || ""}`.trim()],
          ["Reorder level", `${data.reorder_level}`],
        ],
      });
    }

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
    if (!data) return res.status(404).json({ error: "Item not found" });
    res.json(shape(data));
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { error } = await supabase.from(TABLE).delete().eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Item deleted" });
  } catch (e) {
    next(e);
  }
};

/* -------------------------------------------------------------------------- */
/*  One item: its purchases (batches), stock left per cost, and units sold     */
/* -------------------------------------------------------------------------- */
const normName = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// lines of a transaction / procurement order: items[] or the single-item columns
const linesOf = (r) =>
  Array.isArray(r.items) && r.items.length
    ? r.items
    : r.item_name
      ? // single-item record: a transaction only has its total amount; an order has unit_cost
        [
          {
            item_name: r.item_name,
            quantity: r.quantity,
            unit_cost: r.unit_cost,
            amount: r.unit_cost == null ? r.amount : undefined,
          },
        ]
      : [];

// GET /inventory/:id/insights?from=YYYY-MM-DD&to=YYYY-MM-DD
export const insights = async (req, res, next) => {
  try {
    const { data: item, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!item) return res.status(404).json({ error: "Item not found" });
    const target = normName(item.item_name);

    const [{ data: rows }, { data: txns }, { data: orders }] = await Promise.all([
      supabase.from(TABLE).select("*").eq("user_id", req.user.id).order("received_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("transaction_type, items, item_name, quantity, amount, created_at, transaction_code")
        .eq("user_id", req.user.id)
        .in("transaction_type", ["SALE", "PURCHASE"])
        .order("created_at", { ascending: true }),
      supabase
        .from("procurement")
        .select("*")
        .eq("user_id", req.user.id)
        .eq("procurement_status", "RECEIVED"),
    ]);

    // stock left now, per batch (FIFO order)
    const batches = (rows || [])
      .filter((b) => normName(b.item_name) === target)
      .map((b) => ({
        batch_no: b.batch_no || null,
        received_at: b.received_at || b.created_at,
        unit_cost: num(b.cost_price ?? b.unit_price),
        remaining: num(b.quantity),
        unit: b.unit,
      }));
    const remaining = batches.reduce((s, b) => s + b.remaining, 0);

    // every purchase of this item: purchase transactions + received procurement orders
    const purchases = [];
    const sales = [];
    for (const t of txns || []) {
      for (const l of linesOf(t)) {
        if (normName(l.item_name) !== target) continue;
        const qty = num(l.quantity);
        if (t.transaction_type === "PURCHASE") {
          const cost = num(l.unit_cost ?? l.cost_price ?? l.unit_price ?? (qty ? num(l.amount) / qty : 0));
          purchases.push({
            date: t.created_at,
            quantity: qty,
            unit_cost: cost,
            total: +(qty * cost).toFixed(2),
            source: "Purchase",
            ref: t.transaction_code || null,
          });
        } else {
          const revenue = l.amount != null ? num(l.amount) : qty * num(l.unit_price);
          sales.push({ date: t.created_at, quantity: qty, revenue });
        }
      }
    }
    for (const o of orders || []) {
      for (const l of linesOf(o)) {
        if (normName(l.item_name) !== target) continue;
        const qty = num(l.quantity);
        const cost = num(l.unit_cost ?? l.cost_price);
        purchases.push({
          date: o.arrival_date || o.updated_at || o.created_at,
          quantity: qty,
          unit_cost: cost,
          total: +(qty * cost).toFixed(2),
          source: "Procurement",
          ref: o.procurement_no || null,
        });
      }
    }

    // stock that was there when the item was added: what is left + what was sold − what was bought
    const bought = purchases.reduce((s, p) => s + p.quantity, 0);
    const sold = sales.reduce((s, x) => s + x.quantity, 0);
    const opening = +(remaining + sold - bought).toFixed(3);
    const first = batches[0] || { received_at: item.created_at, unit_cost: num(item.cost_price) };
    if (opening > 0)
      purchases.push({
        date: first.received_at,
        quantity: opening,
        unit_cost: first.unit_cost,
        total: +(opening * first.unit_cost).toFixed(2),
        source: "Opening stock",
        ref: null,
        estimated: true,
      });
    purchases.sort((a, b) => new Date(a.date) - new Date(b.date));

    // units sold: today, last 7 days, last 30 days (Sri Lanka days) and the chosen range
    const today = localDateStr();
    const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
    const from = isDate(req.query.from) ? req.query.from : addDays(today, -29);
    const to = isDate(req.query.to) ? req.query.to : today;
    const sumSince = (start, end = addDays(today, 1)) => {
      const a = localDayStart(start).getTime();
      const b = localDayStart(end).getTime();
      const xs = sales.filter((x) => {
        const t = new Date(x.date).getTime();
        return t >= a && t < b;
      });
      return {
        units: +xs.reduce((s, x) => s + x.quantity, 0).toFixed(3),
        revenue: +xs.reduce((s, x) => s + x.revenue, 0).toFixed(2),
        sales: xs.length,
      };
    };

    res.json({
      item: { id: item[ID], name: item.item_name, unit: item.unit },
      batches,
      purchases,
      sales: {
        today: sumSince(today),
        last_7_days: sumSince(addDays(today, -6)),
        last_30_days: sumSince(addDays(today, -29)),
        range: { from, to, ...sumSince(from, addDays(to, 1)) },
        all_time: { units: +sold.toFixed(3) },
      },
    });
  } catch (e) {
    next(e);
  }
};
