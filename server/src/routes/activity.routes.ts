import { Router } from "express";
import { authenticate } from "@/middleware/auth.middleware.js";
import { getActivities } from "@/controllers/activity.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getActivities);

export default router;
