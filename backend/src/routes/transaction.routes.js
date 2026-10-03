import { Router } from "express";
import * as ctrl from "../controllers/transaction.controller.js";
import auth from "../middlewares/auth.middleware.js";
import { validateId, validateBody } from "../middlewares/validate.middleware.js";
import * as S from "../validation/schemas.js";

const router = Router();

router.use(auth);

router.get("/journal", ctrl.journal);
router.post("/", validateBody(S.transaction), ctrl.create);
router.get("/", ctrl.getAll);
router.get("/:id", validateId, ctrl.getOne);
router.put("/:id", validateId, validateBody(S.transaction), ctrl.update);
router.delete("/:id", validateId, ctrl.remove);

export default router;