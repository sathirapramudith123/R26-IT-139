import { supabase } from "../config/supabase.js";
import { notify } from "../controllers/notification.controller.js";

const num = (v) => Number(v || 0);


export async function adjustStock(userId, itemName, delta, reason = "") {
  if (!itemName || !delta) return null;

  const { data: item } = await supabase
    .from("inventory").select("*")
    .eq("user_id", userId).eq("item_name", itemName).maybeSingle();

  if (!item) return null; 

  const oldQty  = num(item.quantity);
  const newQty  = Math.max(0, oldQty + num(delta));
  const reorder = num(item.reorder_level);
  const unit    = String(item.unit || "unit").toLowerCase();

  const item_status =
    newQty <= 0        ? "OUT_OF_STOCK"
    : newQty <= reorder ? "RUNNING_OUT"
    : "AVAILABLE";

  const { data: updated } = await supabase
    .from("inventory")
    .update({ quantity: newQty, item_status, updated_at: new Date().toISOString() })
    .eq("inventory_id", item.inventory_id)
    .select().single();


  const justRanOut  = newQty <= 0 && oldQty > 0;
  const justWentLow = newQty > 0 && newQty <= reorder && oldQty > reorder;

  if (justRanOut) {
    await notify(userId, {
      title: "Out of stock",
      message: `${itemName} is now out of stock.${reason ? ` (${reason})` : ""}`,
      type: "ALERT",
      category: "INVENTORY",
      link: "/dashboard/inventory",
    });
  } else if (justWentLow) {
    await notify(userId, {
      title: "Low stock alert",
      message: `${itemName} is down to ${newQty} ${unit} — at or below your reorder level of ${reorder}.`,
      type: "WARNING",
      category: "INVENTORY",
      link: "/dashboard/inventory/alerts",
    });
  }

  return updated;
}

export async function hasEnoughStock(userId, itemName, qty) {
  if (!itemName || !qty) return { ok: true };

  const { data: item } = await supabase
    .from("inventory").select("item_name, quantity, unit")
    .eq("user_id", userId).eq("item_name", itemName).maybeSingle();

  if (!item) return { ok: true }; 

  if (num(item.quantity) < num(qty)) {
    return {
      ok: false,
      message: `Not enough stock. Only ${item.quantity} ${String(item.unit).toLowerCase()} of ${itemName} available.`,
    };
  }
  return { ok: true };
}