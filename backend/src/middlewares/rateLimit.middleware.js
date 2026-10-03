// Limits for the /auth endpoints (brute-force and email-spam protection).
// Counts are kept in memory: they reset when the server restarts and are not shared
// between several server instances (that would need a Redis store).
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

const tooMany = (msg) => (req, res) => res.status(429).json({ error: msg });
const MIN = 60 * 1000;

// Login: 10 failed attempts per IP + email in 15 minutes. Several phones on the same
// Wi-Fi share one IP, so the email is part of the key — one person's typos don't
// lock out everyone else in the shop.
export const loginLimiter = rateLimit({
  windowMs: 15 * MIN,
  limit: 10,
  skipSuccessfulRequests: true,          // a successful login is not counted
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip || "")}|${String(req.body?.email || "").trim().toLowerCase()}`,
  handler: tooMany("Too many failed login attempts. Try again in 15 minutes."),
});

// Forgot password: 5 per IP per hour, so nobody can flood an inbox with reset emails
export const forgotLimiter = rateLimit({
  windowMs: 60 * MIN,
  limit: 5,
  handler: tooMany("Too many reset requests. Try again in an hour."),
});

// Register / reset-password: 10 per IP per hour
export const authLimiter = rateLimit({
  windowMs: 60 * MIN,
  limit: 10,
  handler: tooMany("Too many requests. Try again later."),
});
