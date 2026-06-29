import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import errorHandler from "./src/middlewares/error.middleware.js";
import { checkSupabase } from "./src/config/supabase.js";

import authRoutes from "./src/routes/auth.routes.js";
import transactionRoutes from "./src/routes/transaction.routes.js";
import inventoryRoutes from "./src/routes/inventory.routes.js";
import supplierRoutes from "./src/routes/supplier.routes.js";
import procurementRoutes from "./src/routes/procurement.routes.js";
import agencyBankingRoutes from "./src/routes/agencyBanking.routes.js";
import syncRoutes from "./src/routes/sync.routes.js";
import predictionRoutes from "./src/routes/prediction.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/procurement", procurementRoutes);
app.use("/api/v1/agency-banking", agencyBankingRoutes);
app.use("/api/v1/sync", syncRoutes);
app.use("/api/v1/predict", predictionRoutes);   

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

checkSupabase();

app.listen(process.env.PORT || 5000, () =>
  console.log(`API running on http://localhost:${process.env.PORT || 5000}`));