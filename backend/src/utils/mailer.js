import nodemailer from "nodemailer";

// SMTP settings come from .env (see backend/.env.example). Gmail example:
//   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_USER=...  SMTP_PASS=<app password>
const isConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

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

  await getTransporter().sendMail({
    from: `"Lanka-Link" <${process.env.SMTP_USER}>`,
    to,
    subject: "Reset your Lanka-Link password",
    text:
      `We received a request to reset your Lanka-Link password.\n\n` +
      `Open this link to choose a new password (valid for 1 hour):\n${link}\n\n` +
      `If you did not request this, you can ignore this email.`,
  });
}
