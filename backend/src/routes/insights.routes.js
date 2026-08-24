import { Router } from "express";
import * as ctrl from "../controllers/insights.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();
router.use(auth);
router.get("/", ctrl.getInsights);

export default router;