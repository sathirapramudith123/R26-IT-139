// Price suggestions for the transaction form, from GET /transactions/price-hints.
// Same rules in the mobile app (lib/core/price_hints.dart).
import { t } from "@/lib/i18n";
import { formatCurrency } from "@/lib/formatters";

export const priceKey = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const fill = (text, vars) => Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), t(text));

/**
 * Sale: suggest the selling price of the oldest batch in stock (FIFO — old stock keeps its old
 * price / MRP), else the last price the item was sold at.
 * Returns { price, note, warning }; price is null when there is nothing to suggest.
 */
export function saleSuggestion(hint) {
  const batches = hint?.batches || [];
  const first = batches[0];
  const last = hint?.last_sale;
  if (first?.selling_price > 0) {
    const next = batches.find((b) => b.selling_price > 0 && b.selling_price !== first.selling_price);
    let note = fill("Oldest stock: {qty} left at {price}", {
      qty: first.quantity,
      price: formatCurrency(first.selling_price),
    });
    if (next) note += ` · ${fill("then {price}", { price: formatCurrency(next.selling_price) })}`;
    return { price: first.selling_price, note: `${note} — ${t("editable")}`, warning: null };
  }
  if (last?.unit_price > 0) {
    // the price comes from the last sale: warn when the stock sold next cost more than that stock did
    const warning =
      first && last.cost_price > 0 && first.unit_cost > last.cost_price + 0.005
        ? fill("Cost went up from {old} to {new} since the last sale — check the price", {
            old: formatCurrency(last.cost_price),
            new: formatCurrency(first.unit_cost),
          })
        : null;
    return {
      price: last.unit_price,
      note: `${t("Last sold at")} ${formatCurrency(last.unit_price)} — ${t("editable")}`,
      warning,
    };
  }
  return { price: null, note: null, warning: null };
}

/** Purchase: pre-fill the selling price / MRP of the new batch with the newest known selling price. */
export function purchaseSellingPrice(hint) {
  const withPrice = (hint?.batches || []).filter((b) => b.selling_price > 0);
  if (withPrice.length) return withPrice[withPrice.length - 1].selling_price;
  return hint?.last_sale?.unit_price > 0 ? hint.last_sale.unit_price : null;
}

/**
 * Sale: the prices to offer as buttons — each selling price / MRP in stock (oldest first, with the
 * units left at it) and the last sold price if it is different. Empty when there is only one price.
 */
export function priceOptions(hint) {
  const opts = [];
  for (const b of hint?.batches || []) {
    if (!(b.selling_price > 0)) continue;
    const same = opts.find((o) => o.price === b.selling_price);
    if (same) same.left += b.quantity;
    else opts.push({ price: b.selling_price, left: b.quantity });
  }
  const last = hint?.last_sale?.unit_price;
  if (last > 0 && !opts.some((o) => o.price === last)) opts.push({ price: last, left: null, last: true });
  return opts.length > 1 ? opts : [];
}

/**
 * Sale: split `units` over the batches in FIFO order when the chosen price is the oldest batch's
 * selling price — e.g. 8 units with 5 left at 240 and more at 260 -> [5 × 240, 3 × 260].
 * `inCart` = units of this item already in the cart (they use up the oldest batches first).
 * A batch without a selling price takes the chosen price. Otherwise one line at the chosen price.
 */
export function splitByBatch(hint, units, price, inCart = 0) {
  let skip = inCart;
  const queue = [];
  for (const b of hint?.batches || []) {
    const left = Math.max(0, b.quantity - skip);
    skip = Math.max(0, skip - b.quantity);
    if (left > 0) queue.push({ left, price: b.selling_price > 0 ? b.selling_price : null });
  }
  if (!queue.length || queue[0].price !== price) return [{ quantity: units, unit_price: price }];

  const lines = [];
  let need = units;
  for (const q of queue) {
    if (need <= 0) break;
    const take = Math.min(q.left, need);
    const p = q.price ?? price;
    const prev = lines[lines.length - 1];
    if (prev && prev.unit_price === p) prev.quantity += take;
    else lines.push({ quantity: take, unit_price: p });
    need -= take;
  }
  if (need > 0) lines[lines.length - 1].quantity += need; // more than the batches hold: last price
  return lines;
}

/**
 * The hint with the cart lines taken out of stock the way the backend will do it: a line at a
 * batch's own selling price comes out of that batch first, the rest FIFO (backend saleOrder).
 * lines = [{ quantity, unit_price }]
 */
export function afterCart(hint, lines = []) {
  if (!hint || !lines.length) return hint;
  const batches = (hint.batches || []).map((b) => ({ ...b }));
  for (const l of lines) {
    let need = Number(l.quantity) || 0;
    const p = Number(l.unit_price) || 0;
    const order = [
      ...batches.filter((b) => p > 0 && b.selling_price === p),
      ...batches.filter((b) => !(p > 0 && b.selling_price === p)),
    ];
    for (const b of order) {
      if (need <= 0) break;
      const take = Math.min(b.quantity, need);
      b.quantity -= take;
      need -= take;
    }
  }
  return { ...hint, batches: batches.filter((b) => b.quantity > 0) };
}
