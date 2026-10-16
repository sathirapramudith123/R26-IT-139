import { Router } from "express";
import { getIncomeStatement, getPaymentMethods } from "../controllers/report.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/income-statement", authMiddleware, getIncomeStatement);
router.get("/payment-methods", authMiddleware, getPaymentMethods);

export default router;
