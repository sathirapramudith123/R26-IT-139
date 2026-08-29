import { supabase } from "../config/supabase.js";
import { toClient, up } from "../utils/mappers.js";
import { notify } from "./notification.controller.js";
import { predict } from "../utils/mlClient.js";
import { getBank, checkFloat, applyFloat, floatHealth } from "../utils/float.js";

const TABLE = "agency_banking";
const ID = "agency_banking_id";
const num = (v) => (v === "" || v == null ? 0 : Number(v));

// ── Rural agent build: fixed LOW-tier daily limits (no KYC dropdown) ──────
// (matches the CBSL "Low volume / rural" agent tier)
const DAILY_LIMITS = {
  CASH_DEPOSIT:    50000,
  CASH_WITHDRAWAL: 25000,
  FUND_TRANSFER:   50000,
};

// Max transactions/day per NIC (point 3 — Commercial Bank agency limits)
const MAX_TXNS_PER_DAY = { CASH_DEPOSIT: 5, CASH_WITHDRAWAL: 5, FUND_TRANSFER: 5 };

// Allowed source-of-funds values (last = free text via "OTHER")
const SOURCE_OF_FUNDS = ["SALARY", "BUSINESS_INCOME", "REMITTANCE", "SAVINGS", "SALE_OF_PROPERTY", "OTHER"];

const toDb = (b) => ({
  customer_name:    b.customer_name,
  customer_phone:   b.customer_phone,
  customer_nic:     b.customer_nic || null,
  account_number:   b.account_number || null,          // NEW (mandatory in form)
  source_of_funds:  b.source_of_funds || null,         // NEW (mandatory in form)
  transaction_type: up(b.transaction_type),
  agent_bank_id:    b.agent_bank_id || null,
  amount:           Number(b.amount),
  service_fee:      num(b.service_fee),
  commission:       num(b.commission),
  channel:          b.channel || "pos_terminal",
  tx_hour:          b.tx_hour ?? new Date().getHours(),
  created_offline:  Boolean(b.created_offline),
  banking_status:   up(b.status || b.banking_status || "completed"),
});

const shape = (row) => {
  const c = toClient(row, ID);
  c.status = c.banking_status;
  return c;
};

async function todaysTotal(userId, phone, type, excludeId = null) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from(TABLE).select("agency_banking_id, amount")
    .eq("user_id", userId).eq("customer_phone", phone)
    .eq("transaction_type", type).gte("created_at", start.toISOString());
  if (error) throw error;
  return (data || []).filter((r) => r.agency_banking_id !== excludeId)
    .reduce((s, r) => s + num(r.amount), 0);
}

async function todaysCount(userId, nic, type, excludeId = null) {
  if (!nic) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from(TABLE).select("agency_banking_id")
    .eq("user_id", userId).eq("customer_nic", nic)
    .eq("transaction_type", type).gte("created_at", start.toISOString());
  if (error) throw error;
  return (data || []).filter((r) => r.agency_banking_id !== excludeId).length;
}

// Fixed LOW-tier daily limit + cumulative daily + max-txns/day/NIC
async function checkLimit(userId, payload, excludeId = null) {
  const type = payload.transaction_type;
  const limit = DAILY_LIMITS[type];

  // per-transaction cap
  if (limit && payload.amount > limit) {
    const t = type.replace(/_/g, " ").toLowerCase();
    return `Amount exceeds the daily limit of LKR ${limit.toLocaleString()} for ${t}.`;
  }

  // cumulative daily (per customer_phone)
  if (limit) {
    const already = await todaysTotal(userId, payload.customer_phone, type, excludeId);
    if (already + payload.amount > limit) {
      const remaining = Math.max(0, limit - already);
      const t = type.replace(/_/g, " ").toLowerCase();
      return `Daily limit for ${t} is LKR ${limit.toLocaleString()}. ` +
             `Already used today: LKR ${already.toLocaleString()}. Remaining: LKR ${remaining.toLocaleString()}.`;
    }
  }

  // max transactions/day per NIC
  const maxTxns = MAX_TXNS_PER_DAY[type];
  if (maxTxns && payload.customer_nic) {
    const count = await todaysCount(userId, payload.customer_nic, type, excludeId);
    if (count >= maxTxns) {
      const t = type.replace(/_/g, " ").toLowerCase();
      return `Daily transaction limit reached: max ${maxTxns} ${t} transactions per NIC per day.`;
    }
  }

  return null;
}

async function runAnomaly(payload) {
  let result = { is_anomaly: false, anomaly_score: 0 };
  try {
    const r = await predict("anomaly", {
      amount: payload.amount, service_fee: payload.service_fee,
      commission: payload.commission, tx_hour: payload.tx_hour,
      channel: payload.channel, transaction_type: payload.transaction_type,
    });
    result = { is_anomaly: r.is_anomaly || r.prediction === -1, anomaly_score: r.anomaly_score || 0 };
  } catch (mlErr) {
    console.error("ML Prediction Failed, proceeding with defaults:", mlErr.message);
  }
  return result;
}

export const getAll = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*").eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json((data || []).map(shape));
  } catch (e) { next(e); }
};

export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(TABLE).select("*").eq(ID, req.params.id).eq("user_id", req.user.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Transaction not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const payload = toDb(req.body);

    // Validate mandatory fields
    if (!payload.account_number) return res.status(400).json({ error: "Account number is required." });
    // Source of funds is required for deposits only (money coming in -> AML record)
    if (payload.transaction_type === "CASH_DEPOSIT" && !payload.source_of_funds) {
      return res.status(400).json({ error: "Source of funds is required for deposits." });
    }

    // 1. Daily limit + cumulative + max-txns/NIC
    const err = await checkLimit(req.user.id, payload);
    if (err) return res.status(400).json({ error: err });

    // 2. Float check
    let bank = null;
    let floatWarn = null;
    if (payload.agent_bank_id) {
      bank = await getBank(req.user.id, payload.agent_bank_id);
      if (!bank) return res.status(400).json({ error: "Selected bank not found." });
      const fc = checkFloat(bank, payload.transaction_type, payload.amount);
      if (fc.block) return res.status(400).json({ error: fc.reason });
      floatWarn = fc.warn || null;
    }

    // 3. ML anomaly
    const mlResult = await runAnomaly(payload);

    // 4. Insert
    const { data, error } = await supabase
      .from(TABLE).insert([{
        user_id: req.user.id, ...payload,
        is_anomaly: mlResult.is_anomaly, anomaly_score: mlResult.anomaly_score,
      }]).select().single();
    if (error) throw error;

    // 5. Float movement + GL double-entry
    let floatAfter = null;
    let health = null;
    if (bank) {
      floatAfter = await applyFloat(req.user.id, bank, payload.transaction_type, payload.amount, data[ID]);
      await supabase.from(TABLE).update({ float_after: floatAfter })
        .eq(ID, data[ID]).eq("user_id", req.user.id);
      health = floatHealth({ ...bank, float_balance: floatAfter });
      data.float_after = floatAfter;
    }

    // 6. Notifications
    const alerts = [];
    if (mlResult.is_anomaly) alerts.push("Suspicious transaction");
    if (floatWarn) alerts.push(floatWarn);
    if (health && health !== "HEALTHY") alerts.push(`Float ${health.replace("_", " ").toLowerCase()} — top-up recommended`);

    await notify(req.user.id, {
      title: alerts.length ? "Banking alert" : "Banking transaction posted",
      message: `${String(data.transaction_type).replace(/_/g, " ").toLowerCase()} of LKR ${data.amount} for ${data.customer_name}.` +
               (alerts.length ? ` (${alerts.join("; ")})` : ""),
      type: alerts.length ? "WARNING" : "SUCCESS",
      category: "BANKING",
      link: "/dashboard/agency-banking",
    });

    res.status(201).json({ ...shape(data), float_after: floatAfter, float_health: health, float_warning: floatWarn });
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const payload = toDb(req.body);
    if (!payload.account_number) return res.status(400).json({ error: "Account number is required." });
    if (payload.transaction_type === "CASH_DEPOSIT" && !payload.source_of_funds) {
      return res.status(400).json({ error: "Source of funds is required for deposits." });
    }

    const err = await checkLimit(req.user.id, payload, req.params.id);
    if (err) return res.status(400).json({ error: err });

    const mlResult = await runAnomaly(payload);

    const { data, error } = await supabase
      .from(TABLE).update({
        ...payload, is_anomaly: mlResult.is_anomaly,
        anomaly_score: mlResult.anomaly_score, updated_at: new Date().toISOString(),
      }).eq(ID, req.params.id).eq("user_id", req.user.id).select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Transaction not found" });
    res.json(shape(data));
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from(TABLE).delete().eq(ID, req.params.id).eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ message: "Transaction deleted" });
  } catch (e) { next(e); }
};