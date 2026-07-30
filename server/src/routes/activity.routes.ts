import { Router } from "express";
import { authenticate } from "@/middleware/auth.middleware.js";
import { requirePermission } from "@/middleware/workspace-auth.middleware.js";
import { Permission } from "@/constants/permissions.js";
import { getActivities } from "@/controllers/activity.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission(Permission.PROJECT_READ), getActivities);

export default router;
