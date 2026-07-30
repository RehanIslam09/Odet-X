import { Router } from "express";
import {
  generatePlan,
  getActiveDraft,
  getDraft,
  updateDraft,
  discardDraft,
  commitDraft,
} from "@/controllers/plan.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";
import { requirePermission } from "@/middleware/workspace-auth.middleware.js";
import { Permission } from "@/constants/permissions.js";
import {
  generatePlanSchema,
  updatePlanSchema,
} from "@/validators/plan.validator.js";

// mergeParams: true allows access to :projectId from parent project routes
const router = Router({ mergeParams: true });

// All planning routes require authentication
router.use(authenticate);

// GET /projects/:projectId/plans/active
router.get("/active", requirePermission(Permission.PROJECT_READ), getActiveDraft);

// POST /projects/:projectId/plans
router.post("/", requirePermission(Permission.AI_ACTION_EXECUTE), validate(generatePlanSchema), generatePlan);

// GET /projects/:projectId/plans/:draftId
router.get("/:draftId", requirePermission(Permission.PROJECT_READ), getDraft);

// PATCH /projects/:projectId/plans/:draftId
router.patch("/:draftId", requirePermission(Permission.PROJECT_UPDATE), validate(updatePlanSchema), updateDraft);

// DELETE /projects/:projectId/plans/:draftId
router.delete("/:draftId", requirePermission(Permission.PROJECT_UPDATE), discardDraft);

// POST /projects/:projectId/plans/:draftId/commit
router.post("/:draftId/commit", requirePermission(Permission.PROJECT_UPDATE), commitDraft);

export default router;
