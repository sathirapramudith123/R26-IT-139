import { Router } from "express";
import * as ctrl from "../controllers/auth.controller.js";

const router = Router();
router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);
export default router;