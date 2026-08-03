import { Router } from "express";

import authRoutes from "@/routes/auth.routes.js";
import projectRoutes from "@/routes/project.routes.js";
import taskRoutes from "@/routes/task.routes.js";
import userRoutes from "@/routes/user.routes.js";
import dashboardRoutes from "@/routes/dashboard.routes.js";
import activityRoutes from "@/routes/activity.routes.js";
import notificationRoutes from "@/routes/notification.routes.js";
import copilotActionRoutes from "@/routes/copilot-action.routes.js";
import searchRoutes from "@/routes/search.routes.js";
import workspaceRoutes from "@/routes/workspace.routes.js";
import invitationRoutes from "@/routes/invitation.routes.js";
import { workspaceRecommendationRoutes } from "@/routes/project-recommendation.routes.js";
import { resolveOptionalWorkspace } from "@/middleware/workspace-auth.middleware.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running.",
  });
});

router.use("/auth", authRoutes);
router.use("/workspaces", workspaceRoutes);
router.use("/invitations", invitationRoutes);
router.use("/dashboard", resolveOptionalWorkspace, dashboardRoutes);
router.use("/projects", resolveOptionalWorkspace, projectRoutes);
router.use("/tasks", resolveOptionalWorkspace, taskRoutes);
router.use("/users", userRoutes);
router.use("/activities", resolveOptionalWorkspace, activityRoutes);
router.use("/notifications", notificationRoutes);
router.use("/copilot/actions", resolveOptionalWorkspace, copilotActionRoutes);
router.use("/recommendations", resolveOptionalWorkspace, workspaceRecommendationRoutes);
router.use("/search", resolveOptionalWorkspace, searchRoutes);

export default router;
