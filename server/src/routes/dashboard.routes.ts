import { Router } from "express";
import { getOverview } from "@/controllers/dashboard.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { asyncHandler } from "@/utils/async-handler.js";

const router = Router();

// All dashboard routes strictly require authentication
router.use(authenticate);

router.get("/overview", asyncHandler(getOverview));

export default router;
