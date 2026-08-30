import { supabase } from "../config/supabase.js";
import { randomUUID } from "crypto";

const num = (v) => Number(v || 0);

const DAILY_START_CASH = 75000;   // pool resets to this each new day
const RESERVE_FLOOR    = 50000;   // top-up can only use cash ABOVE this

/* -------------------------------------------------------------------------- */
/*  Float health (bank-wise, unchanged)                                       */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*  Global cash pool (one physical drawer per user)                           */
/* -------------------------------------------------------------------------- */

// Get the user's cash pool, lazily creating it and applying the daily reset.
export async function getCashPool(userId) {
  let { data, error } = await supabase
    .from("agent_cash_pool").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;

  // create on first use
  if (!data) {
    const ins = await supabase.from("agent_cash_pool")
      .insert([{ user_id: userId, cash_on_hand: DAILY_START_CASH,
                 reserve_floor: RESERVE_FLOOR, day_start_cash: DAILY_START_CASH,
                 last_reset_date: new Date().toISOString().slice(0, 10) }])
      .select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  // daily reset: if last reset was before today, reset cash to day_start_cash
  const today = new Date().toISOString().slice(0, 10);
  if ((data.last_reset_date || "").slice(0, 10) < today) {
    const upd = await supabase.from("agent_cash_pool")
      .update({ cash_on_hand: num(data.day_start_cash) || DAILY_START_CASH,
                last_reset_date: today, updated_at: new Date().toISOString() })
      .eq("user_id", userId).select().single();
    if (!upd.error && upd.data) return upd.data;
  }
  return data;
}

async function setPoolCash(userId, newCash) {
  const { error } = await supabase.from("agent_cash_pool")
    .update({ cash_on_hand: newCash, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

// Agent adds physical cash into the pool (e.g. withdrew cash from a bank).
export async function addCashToPool(userId, amount) {
  const amt = num(amount);
  if (amt <= 0) return { ok: false, block: true, reason: "Enter an amount greater than 0." };
  const pool = await getCashPool(userId);
  const after = num(pool.cash_on_hand) + amt;
  await setPoolCash(userId, after);
  return { ok: true, cashAfter: after };
}

/* -------------------------------------------------------------------------- */
/*  Transaction-time check                                                    */
/*    Deposit    -> float DOWN, pool cash UP                                   */
/*    Withdrawal -> float UP,   pool cash DOWN  (block if pool can't cover)    */
/* -------------------------------------------------------------------------- */
export function checkFloat(bank, pool, type, amount) {
  const t = String(type || "").toUpperCase();
  const amt = num(amount);
  const float = num(bank.float_balance);
  const floor = num(bank.float_floor);
  const ceiling = num(bank.float_ceiling);
  const cash = num(pool?.cash_on_hand);

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
    // agent pays cash from the global pool
    if (cash - amt < 0) {
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

/* -------------------------------------------------------------------------- */
/*  Apply float movement + global pool update + GL double-entry               */
/* -------------------------------------------------------------------------- */
export async function applyFloat(userId, bank, pool, type, amount, agencyBankingId = null) {
  const t = String(type || "").toUpperCase();
  const amt = num(amount);
  let float = num(bank.float_balance);
  let cash = num(pool.cash_on_hand);

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
    return { floatAfter: float, cashAfter: cash };
  }

  const { error: ledgerErr } = await supabase.from("agent_float_ledger").insert(rows);
  if (ledgerErr) throw ledgerErr;

  // update bank float
  const { error: bankErr } = await supabase.from("agent_banks")
    .update({ float_balance: float, updated_at: new Date().toISOString() })
    .eq("agent_bank_id", bank.agent_bank_id).eq("user_id", userId);
  if (bankErr) throw bankErr;

  // update global cash pool
  await setPoolCash(userId, cash);

  return { floatAfter: float, cashAfter: cash };
}

/* -------------------------------------------------------------------------- */
/*  Float top-up: physical cash (global pool) -> bank float                   */
/*    Enforces the 50k reserve: can only top up with cash ABOVE reserve.      */
/* -------------------------------------------------------------------------- */
export async function topUpFloat(userId, bank, pool, amount, note = "Float top-up") {
  const amt = num(amount);
  const cash = num(pool.cash_on_hand);
  const reserve = num(pool.reserve_floor) || RESERVE_FLOOR;
  const available = cash - reserve;

  if (amt > available) {
    return { ok: false, block: true,
      reason: `Only LKR ${Math.max(0, available).toLocaleString()} is available for top-up ` +
              `(LKR ${reserve.toLocaleString()} is reserved for daily operations, cash on hand LKR ${cash.toLocaleString()}).` };
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
    .update({ float_balance: float, updated_at: new Date().toISOString() })
    .eq("agent_bank_id", bank.agent_bank_id).eq("user_id", userId);
  if (be) throw be;

  await setPoolCash(userId, cashAfter);

  return { ok: true, block: false, floatAfter: float, cashAfter };
}