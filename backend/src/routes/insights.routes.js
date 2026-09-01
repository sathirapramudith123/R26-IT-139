import { Router } from "express";
import * as ctrl from "../controllers/insights.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();
router.use(auth);
router.get("/", ctrl.getInsights);
router.get("/sales-summary", ctrl.getSalesSummary);
router.get("/procurement-summary", ctrl.getProcurementSummary);

export default router;