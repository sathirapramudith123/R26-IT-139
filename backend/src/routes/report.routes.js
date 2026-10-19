import { Router } from "express";
import { getIncomeStatement, getPaymentMethods, getCashFlow } from "../controllers/report.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/income-statement", authMiddleware, getIncomeStatement);
router.get("/payment-methods", authMiddleware, getPaymentMethods);
router.get("/cash-flow", authMiddleware, getCashFlow);

export default router;
