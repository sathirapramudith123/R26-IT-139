import { Router } from "express";
import * as ctrl from "../controllers/bankAccount.controller.js";
import auth from "../middlewares/auth.middleware.js";
import { validateId, validateBody } from "../middlewares/validate.middleware.js";
import * as S from "../validation/schemas.js";

// Dummy bank accounts behind agency banking (see bankAccount.controller.js)
const router = Router();
router.use(auth);

router.get("/", ctrl.list);
router.get("/lookup", ctrl.lookup);
router.get("/messages", ctrl.messages);
router.get("/:id/statement", validateId, ctrl.statement);
router.post("/:id/otp", validateId, validateBody(S.amountOnly), ctrl.sendOtp);
router.post("/:id/balance-inquiry", validateId, ctrl.balanceInquiry);

export default router;
