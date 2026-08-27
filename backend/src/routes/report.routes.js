import { Router } from "express";
import { getIncomeStatement } from "../controllers/report.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/income-statement", authMiddleware, getIncomeStatement);

export default router;