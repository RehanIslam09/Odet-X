import { Router } from "express";

import authRoutes from "@/routes/auth.routes.js";
import projectRoutes from "@/routes/project.routes.js";
import taskRoutes from "@/routes/task.routes.js";
import userRoutes from "@/routes/user.routes.js";
import dashboardRoutes from "@/routes/dashboard.routes.js";
import activityRoutes from "@/routes/activity.routes.js";
import notificationRoutes from "@/routes/notification.routes.js";
import copilotActionRoutes from "@/routes/copilot-action.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running.",
  });
});

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/users", userRoutes);
router.use("/activities", activityRoutes);
router.use("/notifications", notificationRoutes);
router.use("/copilot/actions", copilotActionRoutes);

export default router;