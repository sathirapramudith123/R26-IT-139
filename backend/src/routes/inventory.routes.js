import { Router } from "express";
import Joi from "joi";
import * as ctrl from "../controllers/inventory.controller.js";
import auth from "../middlewares/auth.middleware.js";
import validate, { validateId } from "../middlewares/validate.middleware.js";

const createSchema = Joi.object({
  name:          Joi.string().min(1).required(),
  supplier_name: Joi.string().allow(""),
  quantity:      Joi.number().min(0).required(),
  reorder_level: Joi.number().min(0).default(0),
  unit:          Joi.string().allow(""),
  unit_price:    Joi.number().precision(2).min(0).default(0),
  status:        Joi.string().allow(""),
});

const router = Router();
router.use(auth);
router.get("/status", ctrl.stockStatus);
router.post("/", validate(createSchema), ctrl.create);
router.get("/", ctrl.getAll);
router.get("/:id", validateId, ctrl.getOne);                       // validate id
router.put("/:id", validateId, validate(createSchema), ctrl.update); // validate id + body
router.delete("/:id", validateId, ctrl.remove);                    // validate id
export default router;