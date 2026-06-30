import { Router } from "express";
import { runPrediction } from "../controllers/prediction.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();
router.post("/:component", auth, runPrediction);   // /predict/credit | demand | procurement | anomaly
export default router;