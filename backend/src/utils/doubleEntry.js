// src/utils/doubleEntry.js
// Converts a single-entry transaction into its double-entry journal lines,
// following the DEAD CLIC rule:
//   DEAD (Assets, Expenses, Drawings) -> increase = Debit,  decrease = Credit
//   CLIC (Capital, Liabilities, Income) -> increase = Credit, decrease = Debit
//
// Every transaction produces TWO lines whose amounts are equal, so that
// Total Debit = Total Credit always holds.

const num = (v) => Number(v || 0);
const up = (v) => String(v || "").toUpperCase();

// The "cash-side" account depends on how the money moved.
//   cash            -> Cash A/C           (asset)
//   bank / digital  -> Bank A/C           (asset)
//   credit          -> Trade Receivables / Trade Payables (see per-type)
function cashAccount(paymentMethod) {
  const m = up(paymentMethod);
  if (m === "BANK" || m === "DIGITAL") return "Bank A/C";
  return "Cash A/C";
}

/**
 * Return the two journal lines for one transaction.
 * @returns {{ debit_account, credit_account, amount, note }}
 */
export function toJournalLines(txn) {
  const type = up(txn.transaction_type);
  const method = up(txn.payment_method);
  const amount = num(txn.amount);
  const onCredit = method === "CREDIT";

  let debit_account, credit_account;

  switch (type) {
    case "SALE":
      // Income increases (Credit Sales). The other side is what we received:
      //   cash/bank -> that asset;  credit sale -> a debtor (Trade Receivables)
      debit_account = onCredit ? "Trade Receivables A/C" : cashAccount(method);
      credit_account = "Sales A/C";
      break;

    case "PURCHASE":
      // Expense/asset increases (Debit Purchases). Other side:
      //   cash/bank -> pay from that asset;  credit -> owe a creditor (Payables)
      debit_account = "Purchases A/C";
      credit_account = onCredit ? "Trade Payables A/C" : cashAccount(method);
      break;

    case "EXPENSE":
      // Expense increases (Debit). Paid from cash/bank (asset decreases -> Credit)
      debit_account = `${(txn.category || "General").trim()} Expense A/C`;
      credit_account = cashAccount(method);
      break;

    case "DEPOSIT":
      // Cash paid into the bank: Bank asset up (Debit), Cash asset down (Credit)
      debit_account = "Bank A/C";
      credit_account = "Cash A/C";
      break;

    case "TRANSFER":
      // Move between accounts (default cash -> bank)
      debit_account = "Bank A/C";
      credit_account = "Cash A/C";
      break;

    default:
      // Fallback: keep it balanced against a suspense account
      debit_account = cashAccount(method);
      credit_account = "Suspense A/C";
  }

  return {
    debit_account,
    credit_account,
    amount,
    note: txn.category || txn.description || type.toLowerCase(),
  };
}

/**
 * Expand a list of transactions into flat journal ROWS (one per Dr and per Cr),
 * suitable for a ledger/journal table. Each transaction yields 2 rows sharing
 * a journal_ref so the pair can be grouped.
 */
export function buildJournal(transactions) {
  const rows = [];
  for (const t of transactions || []) {
    const line = toJournalLines(t);
    const date = t.created_at;
    const ref = t.id || t.transaction_id;
    rows.push({
      journal_ref: ref,
      code: t.transaction_code || null,
      date,
      account: line.debit_account,
      direction: "DR",
      debit: line.amount,
      credit: 0,
      particulars: line.debit_account,
      note: line.note,
      transaction_type: t.transaction_type,
      payment_method: t.payment_method,
    });
    rows.push({
      journal_ref: ref,
      code: t.transaction_code || null,
      date,
      account: line.credit_account,
      direction: "CR",
      debit: 0,
      credit: line.amount,
      particulars: `   To ${line.credit_account}`,
      note: line.note,
      transaction_type: t.transaction_type,
      payment_method: t.payment_method,
    });
  }
  return rows;
}

/** Totals for a set of journal rows (should always balance). */
export function journalTotals(rows) {
  const totalDebit = rows.reduce((s, r) => s + num(r.debit), 0);
  const totalCredit = rows.reduce((s, r) => s + num(r.credit), 0);
  return {
    total_debit: +totalDebit.toFixed(2),
    total_credit: +totalCredit.toFixed(2),
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}

/* -------------------------------------------------------------------------- */
/*  Goods movement summary — what was sold / bought (from items[] in txns)     */
/* -------------------------------------------------------------------------- */
export function buildGoodsSummary(transactions) {
  // per item: sold qty, bought qty, sales value, purchase value
  const map = {};
  const norm = (s) => String(s || "").trim();

  const push = (name, field, qty, value) => {
    const key = norm(name);
    if (!key) return;
    const g = (map[key] ||= { item: key, sold_qty: 0, bought_qty: 0, sales_value: 0, purchase_value: 0 });
    g[field] += qty;
    if (field === "sold_qty") g.sales_value += value;
    if (field === "bought_qty") g.purchase_value += value;
  };

  for (const t of transactions || []) {
    const type = up(t.transaction_type);
    const lines =
      Array.isArray(t.items) && t.items.length
        ? t.items
        : t.item_name
          ? [{ item_name: t.item_name, quantity: t.quantity, unit_price: t.amount }]
          : [];

    for (const l of lines) {
      const qty = num(l.quantity);
      if (qty <= 0) continue;
      const lineValue = num(l.unit_price ?? l.cost_price) * qty || 0;
      if (type === "SALE") push(l.item_name, "sold_qty", qty, lineValue || num(t.amount));
      if (type === "PURCHASE") push(l.item_name, "bought_qty", qty, lineValue);
    }
  }

  const items = Object.values(map)
    .map((g) => ({
      ...g,
      net_qty: g.bought_qty - g.sold_qty, // + = stock grew, − = stock shrank
    }))
    .sort((a, b) => b.sold_qty + b.bought_qty - (a.sold_qty + a.bought_qty));

  return {
    items,
    total_sold_qty: items.reduce((s, g) => s + g.sold_qty, 0),
    total_bought_qty: items.reduce((s, g) => s + g.bought_qty, 0),
  };
}

/* -------------------------------------------------------------------------- */
/*  Profit & Loss statement (Trading + P&L) with account names                 */
/* -------------------------------------------------------------------------- */
export function buildProfitAndLoss(transactions) {
  let sales = 0,
    purchases = 0,
    cogs = 0;
  const expenses = {}; // by category

  for (const t of transactions || []) {
    const type = up(t.transaction_type);
    const amt = num(t.amount);

    if (type === "SALE") {
      sales += amt;
      // COGS from items[] cost_price snapshot (set by FIFO at sale time)
      const lines = Array.isArray(t.items) ? t.items : [];
      for (const l of lines) {
        cogs += num(l.cost_price) * num(l.quantity);
      }
    } else if (type === "PURCHASE") {
      purchases += amt;
    } else if (type === "EXPENSE") {
      const cat = (t.category || "General").trim();
      expenses[cat] = (expenses[cat] || 0) + amt;
    }
  }

  const grossProfit = sales - cogs; // Trading result
  const totalExpenses = Object.values(expenses).reduce((s, v) => s + v, 0);
  const netProfit = grossProfit - totalExpenses; // P&L result

  return {
    // Trading account
    sales: +sales.toFixed(2),
    cost_of_goods: +cogs.toFixed(2),
    gross_profit: +grossProfit.toFixed(2),
    // P&L account
    expenses: Object.entries(expenses)
      .map(([name, amount]) => ({ account: `${name} Expense A/C`, amount: +amount.toFixed(2) }))
      .sort((a, b) => b.amount - a.amount),
    total_expenses: +totalExpenses.toFixed(2),
    net_profit: +netProfit.toFixed(2),
    is_profit: netProfit >= 0,
    // extra context
    total_purchases: +purchases.toFixed(2),
  };
}

/* -------------------------------------------------------------------------- */
/*  Ledger — one T-account per account: what was debited and what was credited */
/* -------------------------------------------------------------------------- */
// Account class (DEAD CLIC) decides on which side its balance normally sits
function accountClass(account) {
  if (/^(Cash|Bank|Trade Receivables) A\/C$/.test(account)) return "Asset";
  if (account === "Trade Payables A/C") return "Liability";
  if (account === "Sales A/C") return "Income";
  if (account === "Purchases A/C" || / Expense A\/C$/.test(account)) return "Expense";
  return "Other";
}
const CLASS_ORDER = { Asset: 0, Liability: 1, Income: 2, Expense: 3, Other: 4 };

/**
 * Group journal rows (from buildJournal) by account. Each debit line names the account it
 * was credited from ("To ...") and each credit line the account debited ("By ..."), as in a
 * hand-written ledger. Balance = total debit − total credit (Dr when positive, Cr otherwise).
 */
export function buildLedger(rows) {
  const map = {};
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // rows come in DR/CR pairs that share a journal_ref
    const other = r.direction === "DR" ? rows[i + 1] : rows[i - 1];
    const a = (map[r.account] ||= {
      account: r.account,
      class: accountClass(r.account),
      debits: [],
      credits: [],
    });
    const entry = {
      ref: r.journal_ref,
      code: r.code || null,
      date: r.date,
      particulars: `${r.direction === "DR" ? "To" : "By"} ${other?.account || "—"}`,
      amount: r.direction === "DR" ? num(r.debit) : num(r.credit),
      note: r.note,
      transaction_type: r.transaction_type,
      payment_method: r.payment_method,
    };
    (r.direction === "DR" ? a.debits : a.credits).push(entry);
  }
  return Object.values(map)
    .map((a) => {
      const dr = a.debits.reduce((s, e) => s + e.amount, 0);
      const cr = a.credits.reduce((s, e) => s + e.amount, 0);
      const bal = dr - cr;
      return {
        ...a,
        total_debit: +dr.toFixed(2),
        total_credit: +cr.toFixed(2),
        balance: +Math.abs(bal).toFixed(2),
        balance_side: Math.abs(bal) < 0.005 ? "Nil" : bal > 0 ? "Dr" : "Cr",
        count: a.debits.length + a.credits.length,
      };
    })
    .sort((x, y) => CLASS_ORDER[x.class] - CLASS_ORDER[y.class] || y.count - x.count);
}
