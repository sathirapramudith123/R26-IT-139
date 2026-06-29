import { Router } from "express";
import Joi from "joi";
import * as ctrl from "../controllers/agencyBanking.controller.js";
import auth from "../middlewares/auth.middleware.js";
import validate, { validateId } from "../middlewares/validate.middleware.js";

const createSchema = Joi.object({
  customer_name:    Joi.string().min(1).required(),
  customer_phone:   Joi.string().pattern(/^(0|\+94)[0-9]{9}$/).required()
                       .messages({ "string.pattern.base": "customer_phone must be a valid Sri Lankan number (e.g. 0771234567)" }),
  transaction_type: Joi.string().valid("cash_deposit", "cash_withdrawal", "fund_transfer", "balance_inquiry").required(),
  amount:           Joi.number().precision(2).min(0).required(),
  service_fee:      Joi.number().precision(2).min(0).default(0),
  commission:       Joi.number().precision(2).min(0).default(0),
  created_offline:  Joi.boolean().default(false),
  status:           Joi.string().valid("pending", "completed", "failed").default("completed"),
});

const router = Router();
router.use(auth);
router.post("/", validate(createSchema), ctrl.create);
router.get("/", ctrl.getAll);
router.get("/:id", validateId, ctrl.getOne);
router.put("/:id", validateId, validate(createSchema), ctrl.update);
router.delete("/:id", validateId, ctrl.remove);
export default router;