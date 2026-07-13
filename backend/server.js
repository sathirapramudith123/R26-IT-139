import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`API running on http://localhost:${PORT}`);
  await checkSupabase();
});