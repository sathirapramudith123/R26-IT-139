import { Router } from "express";
import * as ctrl from "../controllers/auth.controller.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import * as S from "../validation/schemas.js";
import { loginLimiter, forgotLimiter, authLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();
router.post("/register", authLimiter, validateBody(S.register), ctrl.register);
router.post("/login", loginLimiter, validateBody(S.login), ctrl.login);
router.post("/forgot-password", forgotLimiter, validateBody(S.forgotPassword), ctrl.forgotPassword);
router.post("/reset-password", authLimiter, validateBody(S.resetPassword), ctrl.resetPassword);
export default router;