import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { renderEmail } from "./emailTemplate.js";

// SMTP settings come from .env. Gmail example:
//   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_USER=...  SMTP_PASS=<app password>
// Alert emails can be switched off with EMAIL_ALERTS=false.
export const isConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const LOGO = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../assets/email-logo.png");
const frontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

let transporter = null;
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/** Send one branded email (see emailTemplate.js for the fields). */
export async function sendBrandedEmail(to, subject, content) {
  const { html, text } = renderEmail(content);
  await getTransporter().sendMail({
    from: `"Lanka-Link" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
    attachments: [{ filename: "logo.png", path: LOGO, cid: "logo" }],
  });
}

export async function sendResetEmail(to, link) {
  if (!isConfigured()) {
    // Local development without SMTP: show the link in the server console only.
    // Never done in production — the link must reach the user by email.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[mail] SMTP not configured — password reset link for ${to}:\n${link}`);
      return;
    }
    throw new Error("SMTP is not configured");
  }

  await sendBrandedEmail(to, "Reset your Lanka-Link password", {
    title: "Reset your password",
    message: "We received a request to reset your Lanka-Link password. The link below works for 1 hour.",
    severity: "INFO",
    button: { label: "Choose a new password", url: link },
    footer: "If you did not ask for this, you can ignore this email — your password stays the same.",
  });
}

// the same alert to the same person at most once per 6 hours (a busy day of sales would
// otherwise send a "low stock" email after every sale)
const ALERT_GAP_MS = 6 * 60 * 60 * 1000;
const lastSent = new Map();

/**
 * Email an important in-app notification. Never throws — a mail problem must not break the
 * request that raised the alert.
 */
export async function sendAlertEmail(to, { title, message, severity = "WARNING", details = [], link }) {
  if (!to || !isConfigured() || process.env.EMAIL_ALERTS === "false") return;
  const key = `${to}|${title}|${message}`;
  const now = Date.now();
  if (now - (lastSent.get(key) || 0) < ALERT_GAP_MS) return;
  lastSent.set(key, now);

  try {
    await sendBrandedEmail(to, `${severity === "ALERT" ? "🚨" : "⚠️"} ${title} — Lanka-Link`, {
      title,
      message,
      severity,
      details,
      button: link ? { label: "Open in Lanka-Link", url: `${frontendUrl()}${link}` } : undefined,
      footer: "You get this email because something in your shop needs attention.",
    });
  } catch (e) {
    lastSent.delete(key); // allow a retry next time
    console.error("[mail] alert email failed:", e.message);
  }
}
