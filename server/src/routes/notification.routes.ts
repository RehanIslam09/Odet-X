import { Router } from "express";
import {
  getNotificationsHandler,
  getUnreadCountHandler,
  markAsReadHandler,
  markAllAsReadHandler,
} from "@/controllers/notification.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";

const router = Router();

// Require authentication for all notification routes
router.use(authenticate);

// Static routes must come before dynamic `/:id` routes
router.get("/unread-count", getUnreadCountHandler);
router.patch("/read-all", markAllAsReadHandler);

// Dynamic and root routes
router.get("/", getNotificationsHandler);
router.patch("/:id/read", markAsReadHandler);

export default router;
