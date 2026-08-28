import { supabase } from "../config/supabase.js";
import { randomUUID } from "crypto";

const num = (v) => Number(v || 0);

// Float health status — utilization ratio = float / floor (document section: monitoring)
export function floatHealth(bank) {
  const floor = num(bank.float_floor);
  if (floor <= 0) return "HEALTHY";
  const ratio = num(bank.float_balance) / floor;
  if (ratio <= num(bank.alert_crit_pct) / 100) return "CRITICAL_ALERT";
  if (ratio <= num(bank.alert_low_pct) / 100) return "LOW_ALERT";
  return "HEALTHY";
}

// Get one bank row for a user
export async function getBank(userId, agentBankId) {
  const { data, error } = await supabase
    .from("agent_banks").select("*")
    .eq("agent_bank_id", agentBankId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Transaction-time check BEFORE allowing an agency-banking transaction.
 * Document logic:
 *   Deposit    -> float DECREASES  (agent lends float to fund customer deposit)
 *   Withdrawal -> float INCREASES  (bank moves value into agent float)
 * Floor matters on WITHDRAWAL-side... but note: withdrawal RAISES float, so the
 * float-draining action is the DEPOSIT. We therefore guard the *deposit* against
 * dropping float below what's needed. To match the document's invariant we treat:
 *   - DEPOSIT  reduces float  -> block if it would go below 0 / warn below floor
 *   - WITHDRAWAL raises float -> warn if it exceeds ceiling (sweep), never block
 *
 * Returns { ok, block, reason, warn }.
 */
export function checkFloat(bank, type, amount) {
  const t = String(type || "").toUpperCase();
  const amt = num(amount);
  const bal = num(bank.float_balance);
  const floor = num(bank.float_floor);
  const ceiling = num(bank.float_ceiling);

  // DEPOSIT drains float (agent funds customer's deposit from own float)
  if (t.includes("DEPOSIT")) {
    const after = bal - amt;
    if (after < 0) {
      return { ok: false, block: true,
        reason: `Insufficient float — cannot fund this deposit. Available float: LKR ${bal.toLocaleString()}.` };
    }
    if (after < floor) {
      return { ok: true, block: false,
        warn: `Float will drop below floor (LKR ${floor.toLocaleString()}) — a top-up is recommended.` };
    }
    return { ok: true, block: false };
  }

  // WITHDRAWAL raises float (bank credits agent float, agent pays cash)
  if (t.includes("WITHDRAWAL")) {
    const after = bal + amt;
    if (after > ceiling) {
      return { ok: true, block: false,
        warn: `Float exceeding ceiling (LKR ${ceiling.toLocaleString()}) — schedule a sweep to the bank.` };
    }
    return { ok: true, block: false };
  }

  // transfer / balance inquiry — no float impact
  return { ok: true, block: false };
}

/**
 * Apply a float movement + write the GL double-entry journal.
 * Deposit:    DR Agent Float / CR Agent Cash-on-Hand   (float down, cash up)
 * Withdrawal: DR Agent Cash-on-Hand / CR Agent Float   (float up, cash down)
 * Returns the new float balance.
 */
export async function applyFloat(userId, bank, type, amount, agencyBankingId = null) {
  const t = String(type || "").toUpperCase();
  const amt = num(amount);
  let float = num(bank.float_balance);
  let cash = num(bank.cash_on_hand);

  let rows = [];
  const ref = randomUUID();
  const base = { user_id: userId, agent_bank_id: bank.agent_bank_id,
    agency_banking_id: agencyBankingId, journal_ref: ref, amount: amt };

  if (t.includes("DEPOSIT")) {
    float -= amt; cash += amt;
    rows = [
      { ...base, event_type: "DEPOSIT", gl_account: "Agent Float",        gl_direction: "DR", float_after: float },
      { ...base, event_type: "DEPOSIT", gl_account: "Agent Cash-on-Hand", gl_direction: "CR", float_after: null },
    ];
  } else if (t.includes("WITHDRAWAL")) {
    float += amt; cash -= amt;
    rows = [
      { ...base, event_type: "WITHDRAWAL", gl_account: "Agent Cash-on-Hand", gl_direction: "DR", float_after: null },
      { ...base, event_type: "WITHDRAWAL", gl_account: "Agent Float",        gl_direction: "CR", float_after: float },
    ];
  } else {
    return float; // no float impact
  }

  // 1. write ledger journal (double-entry)
  const { error: ledgerErr } = await supabase.from("agent_float_ledger").insert(rows);
  if (ledgerErr) throw ledgerErr;

  // 2. update bank balances
  const { error: bankErr } = await supabase.from("agent_banks")
    .update({ float_balance: float, cash_on_hand: cash, updated_at: new Date().toISOString() })
    .eq("agent_bank_id", bank.agent_bank_id).eq("user_id", userId);
  if (bankErr) throw bankErr;

  return float;
}

/**
 * Manual float top-up: agent deposits physical cash into float account at bank.
 *   DR Agent Float / CR Agent Cash-on-Hand
 */
export async function topUpFloat(userId, bank, amount, note = "Float top-up") {
  const amt = num(amount);
  const float = num(bank.float_balance) + amt;
  const cash = num(bank.cash_on_hand) - amt;
  const ref = randomUUID();

  const rows = [
    { user_id: userId, agent_bank_id: bank.agent_bank_id, journal_ref: ref, amount: amt,
      event_type: "TOPUP", gl_account: "Agent Float",        gl_direction: "DR", float_after: float, note },
    { user_id: userId, agent_bank_id: bank.agent_bank_id, journal_ref: ref, amount: amt,
      event_type: "TOPUP", gl_account: "Agent Cash-on-Hand", gl_direction: "CR", float_after: null, note },
  ];
  const { error: le } = await supabase.from("agent_float_ledger").insert(rows);
  if (le) throw le;

  const { error: be } = await supabase.from("agent_banks")
    .update({ float_balance: float, cash_on_hand: cash, updated_at: new Date().toISOString() })
    .eq("agent_bank_id", bank.agent_bank_id).eq("user_id", userId);
  if (be) throw be;

  return float;
}