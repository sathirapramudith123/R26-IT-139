// Load backend/.env before any other module reads process.env (the only place it is loaded)
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { checkSupabase } from "./src/config/supabase.js";
import errorHandler from "./src/middlewares/error.middleware.js";

import authRoutes from "./src/routes/auth.routes.js";
import transactionRoutes from "./src/routes/transaction.routes.js";
import inventoryRoutes from "./src/routes/inventory.routes.js";
import supplierRoutes from "./src/routes/supplier.routes.js";
import procurementRoutes from "./src/routes/procurement.routes.js";
import agencyBankingRoutes from "./src/routes/agencyBanking.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import predictionRoutes from "./src/routes/prediction.routes.js";
import insightsRoutes from "./src/routes/insights.routes.js";
import reportRoutes from "./src/routes/report.routes.js";
import agentBankRoutes from "./src/routes/agentBank.routes.js";
import bankAccountRoutes from "./src/routes/bankAccount.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Behind a hosting proxy (Render, Railway, nginx...) set TRUST_PROXY=1 so req.ip is the
// real client IP for the rate limits. Leave it unset when running directly (local / LAN):
// otherwise anyone could fake their IP with an X-Forwarded-For header.
if (process.env.TRUST_PROXY)
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// Only these web origins may call the API from a browser (comma-separated in .env).
// Requests without an Origin header — the mobile app, Postman, server-to-server — are
// not affected: CORS is a browser rule, the API itself is protected by the JWT.
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  }),
);
// Standard security headers (OWASP): no MIME sniffing, no framing, no Referer leaks,
// HSTS on HTTPS, and a locked-down CSP (the API only returns JSON). "same-site" lets the
// web app on another localhost port / sub-domain still load API responses.
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
app.disable("x-powered-by");
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

const API = "/api/v1";
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/transactions`, transactionRoutes);
app.use(`${API}/inventory`, inventoryRoutes);
app.use(`${API}/suppliers`, supplierRoutes);
app.use(`${API}/procurement`, procurementRoutes);
app.use(`${API}/agency-banking`, agencyBankingRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/predict`, predictionRoutes);
app.use(`${API}/insights`, insightsRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/agent-banks`, agentBankRoutes);
app.use(`${API}/bank-accounts`, bankAccountRoutes);

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use(errorHandler);

// "0.0.0.0" lets phones on the same network reach the API
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`API running on http://localhost:${PORT}`);
  await checkSupabase();
});
