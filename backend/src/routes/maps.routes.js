import { Router } from "express";
import * as ctrl from "../controllers/maps.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();
router.use(auth);
router.get("/:service", ctrl.proxy);

export default router;
