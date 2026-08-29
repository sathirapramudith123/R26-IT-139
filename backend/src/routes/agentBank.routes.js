import { Router } from "express";
import * as ctrl from "../controllers/agentBank.controller.js";
import auth from "../middlewares/auth.middleware.js";
import { validateId } from "../middlewares/validate.middleware.js";

const router = Router();
router.use(auth);

router.post("/", ctrl.create);
router.get("/", ctrl.getAll);
router.get("/:id", validateId, ctrl.getOne);
router.put("/:id", validateId, ctrl.update);
router.delete("/:id", validateId, ctrl.remove);
router.post("/:id/topup", validateId, ctrl.topup);   
router.get("/:id/ledger", validateId, ctrl.ledger);  

export default router;