import crypto from "crypto";
import { supabase } from "../config/supabase.js";
import { isConfigured, sendBrandedEmail } from "./mailer.js";
import { APP_TZ } from "./time.js";

/*
 * Messages from the (dummy) bank to its customer: credit / debit alerts, withdrawal OTPs and
 * balance replies. Every message goes to the customer's simulated SMS inbox
 * (customer_messages, shown in the app's "Customer phone" view); when the customer has an
 * e-mail address and SMTP is configured, it is e-mailed as well.
 */

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 3;

export const hashOtp = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");
export const newOtpCode = () => String(crypto.randomInt(100000, 1000000));

export const maskAccount = (n) => `****${String(n || "").slice(-4)}`;
export const maskPhone = (p) => {
  const s = String(p || "");
  return s.length < 7 ? s : `${s.slice(0, 3)}****${s.slice(-3)}`;
};
const lkr = (v) =>
  `LKR ${Number(v || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const when = (d = new Date()) =>
  new Date(d).toLocaleString("en-GB", {
    timeZone: APP_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

/** Display name of the agent (shop) — used in the message text. */
export async function agentName(userId) {
  const { data } = await supabase.from("users").select("full_name").eq("user_id", userId).maybeSingle();
  return data?.full_name ? `${data.full_name} (Lanka-Link agent)` : "Lanka-Link agent";
}

/** Message bodies, in the style of a bank SMS. */
export const text = {
  credit: ({ account, amount, balance, agent, ref }) =>
    `${account.bank_name}: ${lkr(amount)} credited to A/C ${maskAccount(account.account_number)} by cash deposit at ${agent} on ${when()}. Avl Bal: ${lkr(balance)}. Ref ${ref}`,
  debit: ({ account, amount, balance, agent, ref }) =>
    `${account.bank_name}: ${lkr(amount)} debited from A/C ${maskAccount(account.account_number)} for cash withdrawal at ${agent} on ${when()}. Avl Bal: ${lkr(balance)}. Ref ${ref}`,
  otp: ({ account, amount, agent, code }) =>
    `${account.bank_name}: Your OTP for a cash withdrawal of ${lkr(amount)} from A/C ${maskAccount(account.account_number)} at ${agent} is ${code}. Valid for 5 minutes. Never share this code with anyone.`,
  balance: ({ account, agent }) =>
    `${account.bank_name}: Balance inquiry at ${agent}. A/C ${maskAccount(account.account_number)} available balance: ${lkr(account.balance)} as at ${when()}.`,
  reversal: ({ account, amount, balance, ref, credit }) =>
    `${account.bank_name}: ${lkr(amount)} ${credit ? "credited to" : "debited from"} A/C ${maskAccount(account.account_number)} — reversal of ${ref}. Avl Bal: ${lkr(balance)}.`,
};

const SUBJECT = {
  OTP: "Your one-time password",
  CREDIT: "Credit alert",
  DEBIT: "Debit alert",
  BALANCE: "Balance inquiry",
  REVERSAL: "Transaction reversed",
};

/** Store the SMS (and e-mail it when possible). Never throws — alerts must not break a posted transaction. */
export async function sendCustomerMessage(userId, account, kind, body) {
  try {
    await supabase.from("customer_messages").insert([
      {
        user_id: userId,
        account_id: account.account_id,
        channel: "SMS",
        kind,
        recipient: account.phone,
        body,
      },
    ]);
    if (account.email && isConfigured()) {
      let delivery = "SENT";
      try {
        await sendBrandedEmail(account.email, `${account.bank_name} — ${SUBJECT[kind] || "Account alert"}`, {
          title: SUBJECT[kind] || "Account alert",
          message: body,
          severity: kind === "OTP" || kind === "DEBIT" ? "WARNING" : "INFO",
          footer: "This is a simulated bank message from the Lanka-Link research prototype.",
        });
      } catch (e) {
        delivery = "FAILED";
        console.error("[bank] customer e-mail failed:", e.message);
      }
      await supabase.from("customer_messages").insert([
        {
          user_id: userId,
          account_id: account.account_id,
          channel: "EMAIL",
          kind,
          recipient: account.email,
          body,
          delivery,
        },
      ]);
    }
  } catch (e) {
    console.error("[bank] customer message failed:", e.message);
  }
}
