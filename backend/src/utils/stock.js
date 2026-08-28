import { supabase } from "../config/supabase.js";
import { notify } from "../controllers/notification.controller.js";

const num = (v) => Number(v || 0);
const now = () => new Date().toISOString();

// Per-batch status. Aggregate (RUNNING_OUT) එක item level එකේ ගණන් හැදෙනවා.
const batchStatus = (qty) => (qty <= 0 ? "OUT_OF_STOCK" : "AVAILABLE");

// එක item එකක සියලුම batches — FIFO පිළිවෙළට (පරණ received_at මුලින්)
async function itemBatches(userId, itemName) {
  const { data } = await supabase
    .from("inventory").select("*")
    .eq("user_id", userId).eq("item_name", itemName)
    .order("received_at", { ascending: true });
  return data || [];
}

const totalQty = (batches) => batches.reduce((s, b) => s + num(b.quantity), 0);

async function notifyStock(userId, itemName, totalBefore, totalAfter, reorder, unit, reason) {
  const justRanOut  = totalAfter <= 0 && totalBefore > 0;
  const justWentLow = totalAfter > 0 && totalAfter <= reorder && totalBefore > reorder;
  if (justRanOut) {
    await notify(userId, {
      title: "Out of stock",
      message: `${itemName} is now out of stock.${reason ? ` (${reason})` : ""}`,
      type: "ALERT", category: "INVENTORY", link: "/dashboard/inventory",
    });
  } else if (justWentLow) {
    await notify(userId, {
      title: "Low stock alert",
      message: `${itemName} is down to ${totalAfter} ${unit} — at or below your reorder level of ${reorder}.`,
      type: "WARNING", category: "INVENTORY", link: "/dashboard/inventory/alerts",
    });
  }
}

// ── ප්‍රමාණවත් stock තිබේද? (සියලු batches එකතුව) ──────────────────────
export async function hasEnoughStock(userId, itemName, qty) {
  if (!itemName || !qty) return { ok: true };
  const batches = await itemBatches(userId, itemName);
  if (!batches.length) return { ok: true }; // inventory එකේ නැති item -> block කරන්නෙ නෑ
  const total = totalQty(batches);
  if (total < num(qty)) {
    const unit = String(batches[0].unit || "unit").toLowerCase();
    return { ok: false, message: `Not enough stock. Only ${total} ${unit} of ${itemName} available.` };
  }
  return { ok: true };
}

// ── SALE: FIFO consume — පරණ batch එකෙන් මුලින් අඩු, COGS return ──────
export async function consumeStock(userId, itemName, qty, reason = "") {
  const need = num(qty);
  if (!itemName || need <= 0) return { ok: true, cogs: 0 };

  const batches = await itemBatches(userId, itemName);
  if (!batches.length) return { ok: true, cogs: 0 };

  const totalBefore = totalQty(batches);
  const unit = String(batches[0].unit || "unit").toLowerCase();
  if (totalBefore < need) {
    return { ok: false, cogs: 0, message: `Not enough stock. Only ${totalBefore} ${unit} of ${itemName} available.` };
  }

  const reorder = num(batches[0].reorder_level);
  let remaining = need;
  let cogs = 0;

  for (const b of batches) {
    if (remaining <= 0) break;
    const avail = num(b.quantity);
    if (avail <= 0) continue;
    const take = Math.min(avail, remaining);
    const newQty = avail - take;
    cogs += take * num(b.cost_price ?? b.unit_price);   // ඒ batch එකේ cost එකෙන්
    remaining -= take;
    await supabase.from("inventory")
      .update({ quantity: newQty, item_status: batchStatus(newQty), updated_at: now() })
      .eq("inventory_id", b.inventory_id);
  }

  await notifyStock(userId, itemName, totalBefore, totalBefore - need, reorder, unit, reason);
  return { ok: true, cogs: +cogs.toFixed(2) };
}

// ── PURCHASE / stock-in: cost එක වෙනස් නම් අලුත් batch, එකම නම් merge ──
export async function receiveStock(userId, itemName, qty, costPrice, reason = "") {
  const addQty = num(qty);
  if (!itemName || addQty <= 0) return null;

  const batches = await itemBatches(userId, itemName);
  const cost = num(costPrice);

  // එකම cost එකේ batch එකක් තියෙනවා නම් ඒකට එකතු කරනවා
  const sameCost = batches.find((b) => num(b.cost_price ?? b.unit_price) === cost);
  if (sameCost) {
    const newQty = num(sameCost.quantity) + addQty;
    const { data } = await supabase.from("inventory")
      .update({ quantity: newQty, item_status: batchStatus(newQty), updated_at: now() })
      .eq("inventory_id", sameCost.inventory_id).select().single();
    return data;
  }

  // නැත්නම් අලුත් batch row එකක් — meta එක තියෙන batch එකකින් copy කරනවා
  const t = batches[batches.length - 1] || batches[0] || {};
  const { data } = await supabase.from("inventory").insert([{
    user_id: userId,
    item_name: itemName,
    category: t.category ?? "Other",
    supplier_name: t.supplier_name ?? null,
    quantity: addQty,
    reorder_level: num(t.reorder_level),
    unit: t.unit ?? "UNIT",
    cost_price: cost,
    unit_price: cost,
    lead_time_days: num(t.lead_time_days ?? 1),
    received_at: now(),
    item_status: batchStatus(addQty),
  }]).select().single();
  return data;
}

// ── Backward-compat wrapper ───────────────────────────────────────────
// procurement.controller.js වගේ තැන් තාම adjustStock පාවිච්චි කරන නිසා.
//   delta < 0  -> FIFO consume
//   delta > 0  -> receive (costPrice දුන්නොත් ඒකට, නැත්නම් newest batch එකේ cost එකට)
export async function adjustStock(userId, itemName, delta, reason = "", costPrice = null) {
  const d = num(delta);
  if (!itemName || !d) return null;

  if (d < 0) {
    return consumeStock(userId, itemName, Math.abs(d), reason);
  }

  let cost = costPrice != null ? num(costPrice) : null;
  if (cost == null) {
    const batches = await itemBatches(userId, itemName);
    const newest = batches[batches.length - 1];
    cost = newest ? num(newest.cost_price ?? newest.unit_price) : 0;
  }
  return receiveStock(userId, itemName, d, cost, reason);
}