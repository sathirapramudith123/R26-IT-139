import { supabase } from "../config/supabase.js";
import { toClient, up } from "../utils/mappers.js";
import { notify } from "./notification.controller.js";
import { predict } from "../utils/mlClient.js";
import { buildAnomalyFeatures } from "../utils/features.js";
import { localParts } from "../utils/time.js";
import {
  checkFloat,
  floatHealth,
  postBanking,
  updateBanking,
  deleteBanking,
  postAccountBanking,
  deleteAccountBanking,
  bankingError,
} from "../utils/float.js";
import { findAccount, verifyOtp } from "./bankAccount.controller.js";
import { agentName, sendCustomerMessage, text } from "../utils/customerAlerts.js";

const TABLE = "agency_banking";
const ID = "agency_banking_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));

// ── Rural agent build: fixed LOW-tier daily limits (no KYC dropdown) ──────
// (matches the CBSL "Low volume / rural" agent tier)
const DAILY_LIMITS = {
  CASH_DEPOSIT: 50000,
  CASH_WITHDRAWAL: 25000,
  FUND_TRANSFER: 50000,
};

// Max transactions/day per NIC (point 3 — Commercial Bank agency limits)
const MAX_TXNS_PER_DAY = { CASH_DEPOSIT: 5, CASH_WITHDRAWAL: 5, FUND_TRANSFER: 5 };

// CBSL amount-based risk (timestamp-free) — measures how close the amount is
// to the CBSL daily limit for that transaction type.
//   >= 100% of limit -> HIGH   (0.9 risk)
//   >=  80% of limit -> MEDIUM (0.6 risk)
//   <   80%          -> LOW    (0.2 risk)
function cbslAmountRisk(type, amount) {
  const limit = DAILY_LIMITS[type];
  if (!limit) return { level: "LOW", ratio: 0, flag: false };
  const ratio = amount / limit;
  if (ratio >= 1.0) return { level: "HIGH", ratio, flag: true };
  if (ratio >= 0.8) return { level: "MEDIUM", ratio, flag: false };
  return { level: "LOW", ratio, flag: false };
}

// Allowed source-of-funds values (last = free text via "OTHER")
const SOURCE_OF_FUNDS = ["SALARY", "BUSINESS_INCOME", "REMITTANCE", "SAVINGS", "SALE_OF_PROPERTY", "OTHER"];

const toDb = (b) => ({
  customer_name: b.customer_name,
  customer_phone: b.customer_phone,
  customer_nic: b.customer_nic || null,
  account_number: b.account_number || null, // NEW (mandatory in form)
  source_of_funds: b.source_of_funds || null, // NEW (mandatory in form)
  transaction_type: up(b.transaction_type),
  agent_bank_id: b.agent_bank_id || null,
  amount: Number(b.amount),
  service_fee: num(b.service_fee),
  commission: num(b.commission),
  channel: b.channel || "pos_terminal",
  tx_hour: b.tx_hour ?? localParts().hour, // Sri Lanka hour, not the server's
  created_offline: Boolean(b.created_offline),
  banking_status: up(b.status || b.banking_status || "completed"),
});

const shape = (row) => {
  const c = toClient(row, ID);
  c.status = c.banking_status;
  return c;
};

// Daily limits (per-transaction cap, cumulative per phone, max count per NIC) are
// checked inside the DB functions (sql/atomic_banking.sql) while the user's cash pool
// is locked, so two requests at the same moment cannot both slip under the limit.
const limitsFor = (type) => ({ limit: DAILY_LIMITS[type] ?? null, maxTxns: MAX_TXNS_PER_DAY[type] ?? null });

// The dummy-bank account for this transaction: the account row, null when no partner bank
// is used (or the dummy-bank tables are not installed yet), false when the number is unknown.
async function registeredAccount(userId, payload) {
  if (!payload.agent_bank_id) return null;
  try {
    await supabase.rpc("bank_accounts_seed", { p_user: userId });
    return (await findAccount(userId, payload.agent_bank_id, payload.account_number)) || false;
  } catch (e) {
    if (e?.code === "42P01" || e?.code === "PGRST205" || /bank_accounts/.test(e?.message || "")) return null;
    throw e;
  }
}

// Required-field checks that need no DB access
function checkRequired(payload) {
  if (!payload.account_number) return "Account number is required.";
  // Source of funds is required for deposits only (money coming in -> AML record)
  if (payload.transaction_type === "CASH_DEPOSIT" && !payload.source_of_funds)
    return "Source of funds is required for deposits.";
  return null;
}

// ML anomaly + CBSL amount-based risk (hybrid, timestamp-free)
async function scoreRisk(userId, payload, createdAt = null) {
  const mlResult = await runAnomaly(userId, payload, createdAt);
  const amtRisk = cbslAmountRisk(payload.transaction_type, payload.amount);
  return {
    amtRisk,
    // final flag = ML anomaly OR CBSL amount over limit
    is_anomaly: mlResult.is_anomaly || amtRisk.flag,
    anomaly_score: Math.min(
      100,
      Math.max(Number(mlResult.anomaly_score) || 0, Math.round(amtRisk.ratio * 100)),
    ),
  };
}

// Sends the same feature set the model was trained on (paysim.csv) —
// see buildAnomalyFeatures(). z-score uses the user's last 50 transactions.
async function runAnomaly(userId, payload, createdAt = null) {
  let result = { is_anomaly: false, anomaly_score: 0 };
  try {
    const { data: history } = await supabase
      .from(TABLE)
      .select("amount")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const txn = { ...payload, created_at: createdAt || new Date().toISOString() };
    const r = await predict("anomaly", buildAnomalyFeatures(txn, [txn, ...(history || [])]));
    result = { is_anomaly: r.prediction === 1, anomaly_score: Number(r.score) || 0 };
  } catch (mlErr) {
    console.error("ML Prediction Failed, proceeding with defaults:", mlErr.message);
  }
  return result;
}

export const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json((data || []).map(shape));
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Transaction not found" });
    res.json(shape(data));
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    const payload = toDb(req.body);
    const missing = checkRequired(payload);
    if (missing) return res.status(400).json({ error: missing });

    // Dummy bank: a deposit / withdrawal through a partner bank must use a registered account
    const isCash =
      payload.transaction_type === "CASH_DEPOSIT" || payload.transaction_type === "CASH_WITHDRAWAL";
    const account = isCash ? await registeredAccount(req.user.id, payload) : null;
    if (account === false)
      return res.status(400).json({ error: "No account with this number at the selected bank." });
    if (account && payload.transaction_type === "CASH_WITHDRAWAL") {
      if (Number(account.balance) < payload.amount)
        return res.status(400).json({
          error: `Insufficient balance in the customer's account. Available: LKR ${Number(account.balance).toLocaleString("en-LK")}.`,
        });
      const otpError = await verifyOtp(
        req.user.id,
        account.account_id,
        req.body.otp_id,
        req.body.otp_code,
        payload.amount,
      );
      if (otpError) return res.status(400).json({ error: otpError });
    }

    // 1. Risk score first — the ML call must not run inside the DB transaction
    const risk = await scoreRisk(req.user.id, payload);

    // 2. One DB transaction: daily limits -> float / cash check -> insert -> ledger + balances
    //    (+ the customer's account balance and statement when the account is registered)
    const row = { ...payload, is_anomaly: risk.is_anomaly, anomaly_score: risk.anomaly_score };
    const { data: out, error } = account
      ? await postAccountBanking(
          req.user.id,
          row,
          limitsFor(payload.transaction_type),
          req.body.otp_id || null,
        )
      : await postBanking(req.user.id, row, limitsFor(payload.transaction_type));
    if (error) {
      const known = bankingError(error, payload.transaction_type);
      if (known) return res.status(known.status).json({ error: known.message });
      throw error;
    }
    const data = out.row;
    const bank = out.bank_before;
    const floatAfter = out.float_after ?? null;
    const cashAfter = out.cash_after ?? null;
    const floatWarn = bank
      ? checkFloat(bank, out.pool_before, payload.transaction_type, payload.amount).warn
      : null;
    const health = bank ? floatHealth({ ...bank, float_balance: floatAfter }) : null;

    // 3. Notifications (after the commit)
    const alerts = [];
    if (risk.is_anomaly)
      alerts.push(
        risk.amtRisk.flag
          ? `Amount at ${Math.round(risk.amtRisk.ratio * 100)}% of CBSL limit`
          : "Suspicious transaction",
      );
    if (floatWarn) alerts.push(floatWarn);
    if (health && health !== "HEALTHY")
      alerts.push(`Float ${health.replace("_", " ").toLowerCase()} — top-up recommended`);

    await notify(req.user.id, {
      title: alerts.length ? "Banking alert" : "Banking transaction posted",
      message:
        `${String(data.transaction_type).replace(/_/g, " ").toLowerCase()} of LKR ${data.amount} for ${data.customer_name}.` +
        (alerts.length ? ` (${alerts.join("; ")})` : ""),
      type: alerts.length ? "WARNING" : "SUCCESS",
      category: "BANKING",
      link: "/dashboard/agency-banking",
      details: [
        ["Customer", data.customer_name],
        ["Transaction", String(data.transaction_type).replace(/_/g, " ").toLowerCase()],
        ["Amount", `LKR ${Number(data.amount).toLocaleString("en-LK")}`],
        ...alerts.map((a) => ["Why", a]),
      ],
    });

    // 4. Credit / debit alert to the customer (simulated SMS, + e-mail when possible)
    if (account) {
      const msg = {
        account,
        amount: data.amount,
        balance: out.balance_after,
        agent: await agentName(req.user.id),
        ref: data.reference_code,
      };
      const credit = data.transaction_type === "CASH_DEPOSIT";
      await sendCustomerMessage(
        req.user.id,
        account,
        credit ? "CREDIT" : "DEBIT",
        credit ? text.credit(msg) : text.debit(msg),
      );
    }

    res.status(201).json({
      ...shape(data),
      balance_before: out.balance_before ?? null,
      balance_after: out.balance_after ?? null,
      float_after: floatAfter,
      cash_after: cashAfter,
      float_health: health,
      float_warning: floatWarn,
    });
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const payload = toDb(req.body);
    const missing = checkRequired(payload);
    if (missing) return res.status(400).json({ error: missing });

    const { data: old } = await supabase
      .from(TABLE)
      .select("*")
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (!old) return res.status(404).json({ error: "Transaction not found" });
    // posted to a customer's account: like a real bank, the money side cannot be edited
    if (
      old.bank_account_id &&
      (Number(old.amount) !== payload.amount ||
        old.transaction_type !== payload.transaction_type ||
        old.account_number !== payload.account_number ||
        old.agent_bank_id !== payload.agent_bank_id)
    )
      return res.status(400).json({
        error:
          "This transaction was posted to the customer's account — amount, type, account and bank cannot be changed. Delete it to reverse it.",
      });

    // original timestamp so weekday/day_of_month features stay correct on edit
    const risk = await scoreRisk(req.user.id, payload, old.created_at);

    // One DB transaction: limits -> reverse the old float movement -> apply the new one
    // -> update the record. If the new movement is blocked, the reversal is undone too.
    const { data: out, error } = await updateBanking(
      req.user.id,
      req.params.id,
      { ...payload, is_anomaly: risk.is_anomaly, anomaly_score: risk.anomaly_score },
      limitsFor(payload.transaction_type),
    );
    if (error) {
      const known = bankingError(error, payload.transaction_type);
      if (known) return res.status(known.status).json({ error: known.message });
      throw error;
    }
    res.json(shape(out.row));
  } catch (e) {
    next(e);
  }
};

// PATCH /agency-banking/:id/mark-safe
// Agent override: "I'm sure this is fine" -> clears the anomaly flag (permanent).
export const markSafe = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ is_anomaly: false, anomaly_score: 0, updated_at: new Date().toISOString() })
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Transaction not found" });
    res.json({ ...shape(data), message: "Transaction marked as safe." });
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { data: old } = await supabase
      .from(TABLE)
      .select("*")
      .eq(ID, req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (!old) return res.status(404).json({ error: "Transaction not found" });

    // One DB transaction: undo the account balance (if any) and the float / cash movement,
    // then delete the record
    const { data: out, error } = old.bank_account_id
      ? await deleteAccountBanking(req.user.id, req.params.id)
      : await deleteBanking(req.user.id, req.params.id);
    if (error) {
      const known = bankingError(error);
      if (known) return res.status(known.status).json({ error: known.message });
      throw error;
    }

    if (old.bank_account_id && out?.account_id) {
      const { data: acc } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("account_id", out.account_id)
        .maybeSingle();
      if (acc)
        await sendCustomerMessage(
          req.user.id,
          acc,
          "REVERSAL",
          text.reversal({
            account: acc,
            amount: old.amount,
            balance: acc.balance,
            ref: old.reference_code,
            credit: old.transaction_type === "CASH_WITHDRAWAL",
          }),
        );
    }
    res.json({ message: "Transaction deleted" });
  } catch (e) {
    next(e);
  }
};
