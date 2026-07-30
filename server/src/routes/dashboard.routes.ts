import { Router } from "express";
import { getOverview } from "@/controllers/dashboard.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { requirePermission } from "@/middleware/workspace-auth.middleware.js";
import { Permission } from "@/constants/permissions.js";
import { asyncHandler } from "@/utils/async-handler.js";

const router = Router();

// All dashboard routes strictly require authentication and DASHBOARD_VIEW capability
router.use(authenticate);

router.get("/overview", requirePermission(Permission.DASHBOARD_VIEW), asyncHandler(getOverview));

export default router;
