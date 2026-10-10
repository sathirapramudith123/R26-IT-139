import { Router } from "express";
import * as ctrl from "../controllers/insights.controller.js";
import auth from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import * as S from "../validation/schemas.js";

const router = Router();
router.use(auth);
router.get("/", ctrl.getInsights);
router.get("/sales-summary", ctrl.getSalesSummary);
router.get("/procurement-summary", ctrl.getProcurementSummary);
router.post("/credit/what-if", validateBody(S.creditWhatIf), ctrl.creditWhatIf);
router.get("/credit/actions", ctrl.creditActions);

export default router;
