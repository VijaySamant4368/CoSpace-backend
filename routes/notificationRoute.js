import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  listMyNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/", protect, listMyNotifications);
router.patch("/:id/read", protect, markAsRead);
router.patch("/read-all", protect, markAllAsRead);

export default router;
