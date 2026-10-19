import axios from "axios";

/*
 * Real SMS for the (dummy) bank's customer messages, through Notify.lk (a Sri Lankan SMS gateway).
 * Set in backend/.env:
 *   NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY, NOTIFY_LK_SENDER_ID (NotifyDEMO while testing)
 *   SMS_TEST_PHONE   optional — while testing, every SMS goes to this number instead of the
 *                    simulated customer's (made-up) number
 * Without the keys nothing is sent and the message stays in the simulated inbox only.
 */
export const smsConfigured = () =>
  Boolean(process.env.NOTIFY_LK_USER_ID && process.env.NOTIFY_LK_API_KEY && process.env.NOTIFY_LK_SENDER_ID);

/** 0704083193 / +94704083193 / 94704083193 → 94704083193 (null if it is not a Sri Lankan mobile). */
export function toIntl(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (/^0\d{9}$/.test(d)) return `94${d.slice(1)}`;
  if (/^94\d{9}$/.test(d)) return d;
  return null;
}

/** The number an SMS for this customer really goes to. */
export const smsRecipient = (customerPhone) => process.env.SMS_TEST_PHONE || customerPhone;

/** Send one SMS. Returns "SENT", "FAILED" or "SIMULATED" (gateway not set up). Never throws. */
export async function sendSms(phone, body) {
  if (!smsConfigured()) return "SIMULATED";
  const to = toIntl(phone);
  if (!to) return "FAILED";
  try {
    const { data } = await axios.get("https://app.notify.lk/api/v1/send", {
      params: {
        user_id: process.env.NOTIFY_LK_USER_ID,
        api_key: process.env.NOTIFY_LK_API_KEY,
        sender_id: process.env.NOTIFY_LK_SENDER_ID,
        to,
        message: body,
      },
      timeout: 10000,
    });
    if (String(data?.status).toLowerCase() === "success") return "SENT";
    console.error("[sms] gateway refused:", JSON.stringify(data).slice(0, 200));
    return "FAILED";
  } catch (e) {
    console.error("[sms] send failed:", e.message);
    return "FAILED";
  }
}
