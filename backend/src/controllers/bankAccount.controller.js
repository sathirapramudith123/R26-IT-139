import { supabase } from "../config/supabase.js";
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  agentName,
  hashOtp,
  maskPhone,
  newOtpCode,
  sendCustomerMessage,
  text,
} from "../utils/customerAlerts.js";

/*
 * Dummy bank (simulated core banking) for agency banking: the registered customer
 * accounts of each partner bank, their statements, withdrawal OTPs and the customer's
 * simulated SMS inbox. Deposits / withdrawals themselves are posted by
 * agencyBanking.controller.js (bank_account_post), so they also move the agent's float.
 */

const TABLE = "bank_accounts";
const num = (v) => Number(v || 0);

// account as returned to the agent (phone masked; the agent sees name and balance)
export const publicAccount = (a) => ({
  id: a.account_id,
  agent_bank_id: a.agent_bank_id,
  bank_name: a.bank_name,
  account_number: a.account_number,
  holder_name: a.holder_name,
  holder_nic: a.holder_nic,
  phone: a.phone,
  phone_masked: maskPhone(a.phone),
  has_email: Boolean(a.email),
  balance: num(a.balance),
  status: a.status,
  updated_at: a.updated_at,
});

/** The registered account for (agent bank, account number), or null. Throws only on real DB errors. */
export async function findAccount(userId, agentBankId, accountNumber) {
  if (!agentBankId || !accountNumber) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("agent_bank_id", agentBankId)
    .eq("account_number", String(accountNumber).trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ownAccount(userId, id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("account_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// GET /bank-accounts?agent_bank_id=  — creates the demo accounts on first use
export const list = async (req, res, next) => {
  try {
    const { error: seedErr } = await supabase.rpc("bank_accounts_seed", { p_user: req.user.id });
    if (seedErr) throw seedErr;
    let q = supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", req.user.id)
      .order("bank_name")
      .order("holder_name");
    if (req.query.agent_bank_id) q = q.eq("agent_bank_id", req.query.agent_bank_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json((data || []).map(publicAccount));
  } catch (e) {
    next(e);
  }
};

// GET /bank-accounts/lookup?agent_bank_id=&account_number=
export const lookup = async (req, res, next) => {
  try {
    await supabase.rpc("bank_accounts_seed", { p_user: req.user.id });
    const acc = await findAccount(req.user.id, req.query.agent_bank_id, req.query.account_number);
    if (!acc) return res.status(404).json({ error: "No account with this number at the selected bank." });
    res.json(publicAccount(acc));
  } catch (e) {
    next(e);
  }
};

// GET /bank-accounts/:id/statement
export const statement = async (req, res, next) => {
  try {
    const acc = await ownAccount(req.user.id, req.params.id);
    if (!acc) return res.status(404).json({ error: "Account not found" });
    const { data, error } = await supabase
      .from("bank_account_ledger")
      .select("entry_type, amount, balance_after, note, created_at")
      .eq("account_id", acc.account_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ account: publicAccount(acc), entries: data || [] });
  } catch (e) {
    next(e);
  }
};

// GET /bank-accounts/messages?account_id=  — the customer's simulated SMS / e-mail inbox
export const messages = async (req, res, next) => {
  try {
    let q = supabase
      .from("customer_messages")
      .select("message_id, account_id, channel, kind, recipient, body, delivery, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (req.query.account_id) q = q.eq("account_id", req.query.account_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    next(e);
  }
};

// POST /bank-accounts/:id/otp { amount }  — sends a withdrawal OTP to the customer
export const sendOtp = async (req, res, next) => {
  try {
    const amount = num(req.body.amount);
    const acc = await ownAccount(req.user.id, req.params.id);
    if (!acc) return res.status(404).json({ error: "Account not found" });
    if (acc.status !== "ACTIVE") return res.status(400).json({ error: "This account is not active." });
    if (num(acc.balance) < amount)
      return res
        .status(400)
        .json({ error: `Insufficient balance. Available: LKR ${num(acc.balance).toLocaleString("en-LK")}.` });

    // one live OTP per account: earlier unused codes stop working
    await supabase
      .from("bank_otps")
      .update({ used_at: new Date().toISOString() })
      .eq("account_id", acc.account_id)
      .is("used_at", null);

    const code = newOtpCode();
    const expires = new Date(Date.now() + OTP_TTL_MS).toISOString();
    const { data: otp, error } = await supabase
      .from("bank_otps")
      .insert([
        {
          user_id: req.user.id,
          account_id: acc.account_id,
          amount,
          code_hash: hashOtp(code),
          expires_at: expires,
        },
      ])
      .select("otp_id, expires_at")
      .single();
    if (error) throw error;

    await sendCustomerMessage(
      req.user.id,
      acc,
      "OTP",
      text.otp({ account: acc, amount, agent: await agentName(req.user.id), code }),
    );
    // the code itself is never returned to the agent — only the customer receives it
    res.status(201).json({ otp_id: otp.otp_id, expires_at: otp.expires_at, sent_to: maskPhone(acc.phone) });
  } catch (e) {
    next(e);
  }
};

/**
 * Check an OTP typed by the agent. Returns null when valid (and marks it verified),
 * otherwise an error message. Wrong codes count towards OTP_MAX_ATTEMPTS.
 */
export async function verifyOtp(userId, accountId, otpId, code, amount) {
  if (!otpId || !code) return "Enter the OTP the customer received.";
  const { data: otp, error } = await supabase
    .from("bank_otps")
    .select("*")
    .eq("otp_id", otpId)
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  if (!otp || otp.used_at) return "This OTP is no longer valid — send a new one.";
  if (new Date(otp.expires_at) < new Date()) return "The OTP has expired — send a new one.";
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return "Too many wrong attempts — send a new OTP.";
  if (num(otp.amount) !== num(amount)) return "The amount changed after the OTP was sent — send a new OTP.";
  if (otp.code_hash !== hashOtp(String(code).trim())) {
    await supabase
      .from("bank_otps")
      .update({ attempts: otp.attempts + 1 })
      .eq("otp_id", otpId);
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    return left > 0
      ? `Wrong OTP. ${left} attempt${left > 1 ? "s" : ""} left.`
      : "Too many wrong attempts — send a new OTP.";
  }
  await supabase.from("bank_otps").update({ verified_at: new Date().toISOString() }).eq("otp_id", otpId);
  return null;
}

// POST /bank-accounts/:id/balance-inquiry  — shows the current balance and sends it to the customer
export const balanceInquiry = async (req, res, next) => {
  try {
    const acc = await ownAccount(req.user.id, req.params.id);
    if (!acc) return res.status(404).json({ error: "Account not found" });
    await sendCustomerMessage(
      req.user.id,
      acc,
      "BALANCE",
      text.balance({ account: acc, agent: await agentName(req.user.id) }),
    );
    res.json(publicAccount(acc));
  } catch (e) {
    next(e);
  }
};
