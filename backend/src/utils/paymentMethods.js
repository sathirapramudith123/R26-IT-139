// "Money by payment method": how much came in and went out through Cash, Bank and Digital in a
// period. Follows the same money movements as the journal (utils/doubleEntry.js):
//   SALE              -> in to the method it was paid by      (credit: not received yet)
//   PURCHASE          -> out from the method                   (credit: not paid yet)
//   EXPENSE           -> out from the method (drawings too — the money still left the till)
//   TRANSFER Supplier Payment -> out from the method (bank / digital)
//   DEPOSIT Owner Capital     -> in to the method (new money from the owner, not a sale)
//   DEPOSIT Other Income      -> in to the method (earned, but not from sales)
//   DEPOSIT / other TRANSFER  -> moved: out of Cash, in to Bank (deposit) or the method used
// Moves between the shop's own accounts are kept apart from real income / spending.

import { isCapital, isOtherIncome } from "./doubleEntry.js";

export const METHODS = ["cash", "bank", "digital"];

const num = (v) => Number(v) || 0;
const low = (v) =>
  String(v || "")
    .toLowerCase()
    .trim();
const isSupplierPayment = (category) => /^supplier payment$/i.test(String(category || "").trim());

const emptyMethod = () => ({
  in: { sales: 0, other_income: 0, capital: 0, moved_in: 0, total: 0 },
  out: { purchases: 0, expenses: 0, supplier_payments: 0, moved_out: 0, total: 0 },
  net: 0,
  count: 0,
});

/**
 * @param {Array<object>} transactions  rows of the transactions table
 * @returns {{ methods: Record<string, ReturnType<typeof emptyMethod>>, credit: object, totals: object }}
 */
export function summarizeByMethod(transactions) {
  const methods = Object.fromEntries(METHODS.map((m) => [m, emptyMethod()]));
  const credit = { sales: 0, purchases: 0, count: 0 };

  // unknown / missing method falls back to cash, as the journal does
  const bucket = (m) => methods[METHODS.includes(m) ? m : "cash"];
  const addIn = (m, key, amount) => {
    const b = bucket(m);
    b.in[key] += amount;
    b.count += 1;
  };
  const addOut = (m, key, amount) => {
    const b = bucket(m);
    b.out[key] += amount;
    b.count += 1;
  };

  for (const t of transactions || []) {
    const amount = num(t.amount);
    if (!amount) continue;
    const type = low(t.transaction_type);
    const method = low(t.payment_method);

    if (method === "credit" && (type === "sale" || type === "purchase")) {
      credit[type === "sale" ? "sales" : "purchases"] += amount;
      credit.count += 1;
      continue;
    }

    if (type === "sale") addIn(method, "sales", amount);
    else if (type === "purchase") addOut(method, "purchases", amount);
    else if (type === "expense") addOut(method, "expenses", amount);
    else if (type === "transfer" && isSupplierPayment(t.category))
      addOut(method, "supplier_payments", amount);
    else if (type === "deposit" && isCapital(t.category)) addIn(method, "capital", amount);
    else if (type === "deposit" && isOtherIncome(t.category)) addIn(method, "other_income", amount);
    else if (type === "deposit" || type === "transfer") {
      // cash paid into the bank / moved to another account
      const to = type === "deposit" || method === "cash" || !METHODS.includes(method) ? "bank" : method;
      addOut("cash", "moved_out", amount);
      methods[to].in.moved_in += amount;
    }
  }

  const totals = { in: 0, out: 0, net: 0, sales: 0 };
  for (const m of METHODS) {
    const b = methods[m];
    b.in.total = b.in.sales + b.in.other_income + b.in.capital + b.in.moved_in;
    b.out.total = b.out.purchases + b.out.expenses + b.out.supplier_payments + b.out.moved_out;
    b.net = b.in.total - b.out.total;
    totals.sales += b.in.sales;
    // moves between the shop's own accounts cancel out in the totals
    totals.in += b.in.sales + b.in.other_income;
    totals.out += b.out.purchases + b.out.expenses + b.out.supplier_payments;
  }
  totals.net = totals.in - totals.out;

  // share of the money received from sales, per method (credit sales not included)
  for (const m of METHODS)
    methods[m].sales_share_pct = totals.sales > 0 ? (methods[m].in.sales / totals.sales) * 100 : 0;

  return { methods, credit, totals };
}
