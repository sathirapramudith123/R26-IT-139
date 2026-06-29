import { Router } from "express";
import Joi from "joi";
import * as ctrl from "../controllers/auth.controller.js";
import validate from "../middlewares/validate.middleware.js";

const registerSchema = Joi.object({
  fullName: Joi.string().min(2).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});
const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotSchema = Joi.object({ email: Joi.string().email().required() });
const resetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

const router = Router();
router.post("/register", validate(registerSchema), ctrl.register);
router.post("/login", validate(loginSchema), ctrl.login);
router.post("/forgot-password", validate(forgotSchema), ctrl.forgotPassword);
router.post("/reset-password", validate(resetSchema), ctrl.resetPassword);

export default router;