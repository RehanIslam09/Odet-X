import { Router } from "express";
import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";
import { dryRunActionSchema, confirmActionSchema } from "@/validators/copilot-action.validator.js";
import { dryRunAction, confirmAction } from "@/controllers/copilot-action.controller.js";

const router = Router();

// Require authentication for all copilot action routes
router.use(authenticate);

// POST /api/v1/copilot/actions/dry-run
router.post("/dry-run", validate(dryRunActionSchema), dryRunAction);

// POST /api/v1/copilot/actions/confirm
router.post("/confirm", validate(confirmActionSchema), confirmAction);

export default router;
