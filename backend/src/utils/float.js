import { supabase } from "../config/supabase.js";
import { localDateStr, localDayStart } from "./time.js";

// Every write to a bank float, the cash pool or the float ledger goes through the
// Postgres functions in backend/sql/atomic_banking.sql. Each call is ONE database
// transaction that locks the user's cash pool (and the bank) first, so two requests
// at the same moment cannot overwrite each other's balance, and an error half-way
// saves nothing.

const num = (v) => Number(v || 0);

const DAILY_START_CASH = 75000;
const RESERVE_FLOOR = 50000;
const POOL_DEFAULTS = { p_start_cash: DAILY_START_CASH, p_reserve: RESERVE_FLOOR };

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
    .from("agent_banks")
    .select("*")
    .eq("agent_bank_id", agentBankId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// The user's cash pool — created on first use, reset to the day's starting cash on a
// new (Sri Lanka) day. Done in the DB under a lock (agent_pool_get).
export async function getCashPool(userId) {
  const { data, error } = await supabase.rpc("agent_pool_get", {
    p_user: userId,
    p_today: localDateStr(),
    ...POOL_DEFAULTS,
  });
  if (error) throw error;
  return data;
}

// Warnings only (floor / ceiling) — the blocking checks run inside the DB functions.
export function checkFloat(bank, pool, type, amount) {
  const t = String(type || "").toUpperCase();
  const amt = num(amount);
  const float = num(bank.float_balance);
  const floor = num(bank.float_floor);
  const ceiling = num(bank.float_ceiling);

  if (t.includes("DEPOSIT") && float - amt >= 0 && float - amt < floor) {
    return { warn: `Float will drop below floor (LKR ${floor.toLocaleString()}) — a top-up is recommended.` };
  }
  if (t.includes("WITHDRAWAL") && num(pool?.cash_on_hand) - amt >= 0 && float + amt > ceiling) {
    return {
      warn: `Float will exceed ceiling (LKR ${ceiling.toLocaleString()}) — schedule a sweep to the bank.`,
    };
  }
  return { warn: null };
}

// ── Calls to the DB functions ─────────────────────────────────────────────────
// limits = { limit, maxTxns } for the transaction type (CBSL daily limits)
const dayArgs = () => ({ p_today: localDateStr(), p_day_start: localDayStart().toISOString() });

export async function postBanking(userId, row, limits = {}) {
  return supabase.rpc("banking_post", {
    p_user: userId,
    p_row: row,
    ...dayArgs(),
    p_limit: limits.limit ?? null,
    p_max_txns: limits.maxTxns ?? null,
    ...POOL_DEFAULTS,
  });
}

export async function updateBanking(userId, id, row, limits = {}) {
  return supabase.rpc("banking_update", {
    p_user: userId,
    p_id: id,
    p_row: row,
    ...dayArgs(),
    p_limit: limits.limit ?? null,
    p_max_txns: limits.maxTxns ?? null,
    ...POOL_DEFAULTS,
  });
}

export async function deleteBanking(userId, id) {
  return supabase.rpc("banking_delete", {
    p_user: userId,
    p_id: id,
    p_today: localDateStr(),
    ...POOL_DEFAULTS,
  });
}

// Deposit / withdrawal on a registered dummy-bank account (sql/dummy_bank.sql)
export async function postAccountBanking(userId, row, limits = {}, otpId = null) {
  return supabase.rpc("bank_account_post", {
    p_user: userId,
    p_row: row,
    ...dayArgs(),
    p_limit: limits.limit ?? null,
    p_max_txns: limits.maxTxns ?? null,
    ...POOL_DEFAULTS,
    p_otp_id: otpId,
  });
}

export async function deleteAccountBanking(userId, id) {
  return supabase.rpc("bank_account_delete", {
    p_user: userId,
    p_id: id,
    p_today: localDateStr(),
    ...POOL_DEFAULTS,
  });
}

export async function topUpFloat(userId, bankId, amount, note = "Float top-up") {
  return supabase.rpc("float_topup", {
    p_user: userId,
    p_bank: bankId,
    p_amount: num(amount),
    p_today: localDateStr(),
    p_note: note,
    ...POOL_DEFAULTS,
  });
}

export async function addCashToPool(userId, amount) {
  return supabase.rpc("pool_add_cash", {
    p_user: userId,
    p_amount: num(amount),
    p_today: localDateStr(),
    ...POOL_DEFAULTS,
  });
}

// ── DB rejection -> { status, message } (null = a real error, let it throw) ────
const lkr = (v) => num(v).toLocaleString();
const typeText = (type) =>
  String(type || "")
    .replace(/_/g, " ")
    .toLowerCase();

export function bankingError(error, type = "") {
  if (!error) return null;
  let d = {};
  try {
    d = error.details ? JSON.parse(error.details) : {};
  } catch {
    d = {};
  }
  const t = typeText(type);
  switch (error.message) {
    case "INSUFFICIENT_FLOAT":
      return {
        status: 400,
        message: `Insufficient float — cannot fund this deposit. Available float: LKR ${lkr(d.float)}.`,
      };
    case "INSUFFICIENT_CASH":
      return {
        status: 400,
        message: `Insufficient cash on hand — cannot pay out this withdrawal. Available cash: LKR ${lkr(d.cash)}.`,
      };
    case "CANNOT_UNDO_DEPOSIT":
      return {
        status: 400,
        message: `Cannot undo this deposit — cash on hand (LKR ${lkr(d.cash)}) is less than LKR ${lkr(d.amount)}.`,
      };
    case "CANNOT_UNDO_WITHDRAWAL":
      return {
        status: 400,
        message: `Cannot undo this withdrawal — ${d.bank_name} float (LKR ${lkr(d.float)}) is less than LKR ${lkr(d.amount)}.`,
      };
    case "TOPUP_EXCEEDS":
      return {
        status: 400,
        message:
          `Only LKR ${lkr(Math.max(0, num(d.available)))} is available for top-up ` +
          `(LKR ${lkr(d.reserve)} is reserved for daily operations, cash on hand LKR ${lkr(d.cash)}).`,
      };
    case "PER_TXN_LIMIT":
      return { status: 400, message: `Amount exceeds the daily limit of LKR ${lkr(d.limit)} for ${t}.` };
    case "DAILY_LIMIT":
      return {
        status: 400,
        message:
          `Daily limit for ${t} is LKR ${lkr(d.limit)}. ` +
          `Already used today: LKR ${lkr(d.already)}. Remaining: LKR ${lkr(Math.max(0, num(d.limit) - num(d.already)))}.`,
      };
    case "MAX_TXNS":
      return {
        status: 400,
        message: `Daily transaction limit reached: max ${d.max} ${t} transactions per NIC per day.`,
      };
    case "BANK_NOT_FOUND":
      return { status: 400, message: "Selected bank not found." };
    case "ACCOUNT_NOT_FOUND":
      return { status: 400, message: "No account with this number at the selected bank." };
    case "ACCOUNT_INACTIVE":
      return { status: 400, message: "This account is not active." };
    case "INSUFFICIENT_BALANCE":
      return {
        status: 400,
        message: `Insufficient balance in the customer's account. Available: LKR ${lkr(d.balance)}.`,
      };
    case "OTP_REQUIRED":
      return { status: 400, message: "A valid OTP from the customer is required for this withdrawal." };
    case "UNSUPPORTED_ACCOUNT_TXN":
      return { status: 400, message: "Only deposits and withdrawals can be posted to a customer account." };
    case "CANNOT_UNDO_ACCOUNT":
      return {
        status: 400,
        message: `Cannot undo this deposit — the customer's balance (LKR ${lkr(d.balance)}) is less than LKR ${lkr(d.amount)}.`,
      };
    case "NOT_FOUND":
      return { status: 404, message: "Transaction not found" };
    default:
      return null;
  }
}

// Float-ledger event types that increase the float (for statements)
const FLOAT_IN_EVENTS = ["WITHDRAWAL", "TOPUP", "DEPOSIT_REVERSAL"];
export const isFloatInflow = (eventType) => FLOAT_IN_EVENTS.includes(eventType);
