import { Router } from "express";
import * as ctrl from "../controllers/procurement.controller.js";
import auth from "../middlewares/auth.middleware.js";
import { validateId } from "../middlewares/validate.middleware.js";

const router = Router();
router.use(auth);

router.post("/", ctrl.create);
router.get("/", ctrl.getAll);
router.get("/:id", validateId, ctrl.getOne);
router.put("/:id", validateId, ctrl.update);
router.delete("/:id", validateId, ctrl.remove);

export default router;