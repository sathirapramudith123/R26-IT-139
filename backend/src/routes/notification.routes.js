import { Router } from "express";
import * as ctrl from "../controllers/notification.controller.js";
import auth from "../middlewares/auth.middleware.js";
import { validateId } from "../middlewares/validate.middleware.js";

const router = Router();
router.use(auth);

router.get("/", ctrl.getAll);
router.get("/unread-count", ctrl.unreadCount);
router.put("/read-all", ctrl.markAllRead);
router.put("/:id/read", validateId, ctrl.markRead);
router.delete("/:id", validateId, ctrl.remove);

export default router;