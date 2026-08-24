import { Router } from "express";
import * as ctrl from "../controllers/sync.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();
router.use(auth);
router.post("/submit", ctrl.submit);
router.get("/queue", ctrl.getQueue);
export default router;