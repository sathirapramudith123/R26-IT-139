// src/utils/doubleEntry.js
// Converts a single-entry transaction into its double-entry journal lines,
// following the DEAD CLIC rule:
//   DEAD (Assets, Expenses, Drawings) -> increase = Debit,  decrease = Credit
//   CLIC (Capital, Liabilities, Income) -> increase = Credit, decrease = Debit
//
// Every transaction produces TWO lines whose amounts are equal, so that
// Total Debit = Total Credit always holds.

const num = (v) => Number(v || 0);
const up  = (v) => String(v || "").toUpperCase();

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
      debit_account  = onCredit ? "Trade Receivables A/C" : cashAccount(method);
      credit_account = "Sales A/C";
      break;

    case "PURCHASE":
      // Expense/asset increases (Debit Purchases). Other side:
      //   cash/bank -> pay from that asset;  credit -> owe a creditor (Payables)
      debit_account  = "Purchases A/C";
      credit_account = onCredit ? "Trade Payables A/C" : cashAccount(method);
      break;

    case "EXPENSE":
      // Expense increases (Debit). Paid from cash/bank (asset decreases -> Credit)
      debit_account  = `${(txn.category || "General").trim()} Expense A/C`;
      credit_account = cashAccount(method);
      break;

    case "DEPOSIT":
      // Cash paid into the bank: Bank asset up (Debit), Cash asset down (Credit)
      debit_account  = "Bank A/C";
      credit_account = "Cash A/C";
      break;

    case "TRANSFER":
      // Move between accounts (default cash -> bank)
      debit_account  = "Bank A/C";
      credit_account = "Cash A/C";
      break;

    default:
      // Fallback: keep it balanced against a suspense account
      debit_account  = cashAccount(method);
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
    const ref  = t.id || t.transaction_id;
    rows.push({
      journal_ref: ref, date,
      account: line.debit_account, direction: "DR",
      debit: line.amount, credit: 0,
      particulars: line.debit_account, note: line.note,
      transaction_type: t.transaction_type, payment_method: t.payment_method,
    });
    rows.push({
      journal_ref: ref, date,
      account: line.credit_account, direction: "CR",
      debit: 0, credit: line.amount,
      particulars: `   To ${line.credit_account}`, note: line.note,
      transaction_type: t.transaction_type, payment_method: t.payment_method,
    });
  }
  return rows;
}

/** Totals for a set of journal rows (should always balance). */
export function journalTotals(rows) {
  const totalDebit  = rows.reduce((s, r) => s + num(r.debit), 0);
  const totalCredit = rows.reduce((s, r) => s + num(r.credit), 0);
  return {
    total_debit: +totalDebit.toFixed(2),
    total_credit: +totalCredit.toFixed(2),
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}