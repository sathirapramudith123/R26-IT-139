import { supabase } from "../config/supabase.js";
import { randomUUID } from "crypto";

const num = (v) => Number(v || 0);

// Float health status — utilization ratio = float / floor
export function floatHealth(bank) {
  const floor = num(bank.float_floor);
  if (floor <= 0) return "HEALTHY";
  const ratio = num(bank.float_balance) / floor;
  if (ratio <= num(bank.alert_crit_pct) / 100) return "CRITICAL_ALERT";
  if (ratio <= num(bank.alert_low_pct) / 100) return "LOW_ALERT";
  return "HEALTHY";
}

export async function getBank(userId, agentBankId) {
  const { data, error } = await supabase
    .from("agent_banks").select("*")
    .eq("agent_bank_id", agentBankId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Transaction-time check BEFORE allowing an agency-banking transaction.
 *   Deposit    -> float DOWN, cash UP    (agent funds customer's deposit from float)
 *   Withdrawal -> float UP,   cash DOWN  (agent pays customer cash from own till)
 *
 * Blocks:
 *   - DEPOSIT if float would go below 0 (can't fund it)
 *   - WITHDRAWAL if physical CASH ON HAND would go below 0 (no cash to pay out)
 * Warns:
 *   - DEPOSIT if float drops below floor (top-up recommended)
 *   - WITHDRAWAL if float exceeds ceiling (sweep to bank)
 */
export function checkFloat(bank, type, amount) {
  const t = String(type || "").toUpperCase();
  const amt = num(amount);
  const float = num(bank.float_balance);
  const cash = num(bank.cash_on_hand);
  const floor = num(bank.float_floor);
  const ceiling = num(bank.float_ceiling);

  if (t.includes("DEPOSIT")) {
    const after = float - amt;
    if (after < 0) {
      return { ok: false, block: true,
        reason: `Insufficient float — cannot fund this deposit. Available float: LKR ${float.toLocaleString()}.` };
    }
    if (after < floor) {
      return { ok: true, block: false,
        warn: `Float will drop below floor (LKR ${floor.toLocaleString()}) — a top-up is recommended.` };
    }
    return { ok: true, block: false };
  }

  if (t.includes("WITHDRAWAL")) {
    // agent pays cash out -> cash on hand must cover it
    const cashAfter = cash - amt;
    if (cashAfter < 0) {
      return { ok: false, block: true,
        reason: `Insufficient cash on hand — cannot pay out this withdrawal. Available cash: LKR ${cash.toLocaleString()}.` };
    }
    const floatAfter = float + amt;
    if (floatAfter > ceiling) {
      return { ok: true, block: false,
        warn: `Float will exceed ceiling (LKR ${ceiling.toLocaleString()}) — schedule a sweep to the bank.` };
    }
    return { ok: true, block: false };
  }

  return { ok: true, block: false };
}

/**
 * Apply a float movement + write the GL double-entry journal.
 * Deposit:    DR Agent Float / CR Agent Cash-on-Hand   (float down, cash up)
 * Withdrawal: DR Agent Cash-on-Hand / CR Agent Float   (float up, cash down)
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
    return float;
  }

  const { error: ledgerErr } = await supabase.from("agent_float_ledger").insert(rows);
  if (ledgerErr) throw ledgerErr;

  const { error: bankErr } = await supabase.from("agent_banks")
    .update({ float_balance: float, cash_on_hand: cash, updated_at: new Date().toISOString() })
    .eq("agent_bank_id", bank.agent_bank_id).eq("user_id", userId);
  if (bankErr) throw bankErr;

  return float;
}

/**
 * Manual float top-up: agent moves physical cash into the float account at the bank.
 *   DR Agent Float / CR Agent Cash-on-Hand   (float up, cash down)
 * Blocks if the agent doesn't have enough physical cash on hand.
 * Returns { ok, block, reason, floatAfter }.
 */
export async function topUpFloat(userId, bank, amount, note = "Float top-up") {
  const amt = num(amount);
  const cash = num(bank.cash_on_hand);

  // Guard: can't move more cash into float than the agent physically holds
  if (cash - amt < 0) {
    return { ok: false, block: true,
      reason: `Insufficient cash on hand to top up. Available cash: LKR ${cash.toLocaleString()}.` };
  }

  const float = num(bank.float_balance) + amt;
  const cashAfter = cash - amt;
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
    .update({ float_balance: float, cash_on_hand: cashAfter, updated_at: new Date().toISOString() })
    .eq("agent_bank_id", bank.agent_bank_id).eq("user_id", userId);
  if (be) throw be;

  return { ok: true, block: false, floatAfter: float };
}