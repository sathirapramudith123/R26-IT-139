import { Router } from "express";
import * as ctrl from "../controllers/prediction.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();
router.use(auth);

router.post("/:component", ctrl.run);

export default router;