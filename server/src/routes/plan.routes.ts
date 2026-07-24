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
import {
  generatePlanSchema,
  updatePlanSchema,
} from "@/validators/plan.validator.js";

// mergeParams: true allows access to :projectId from parent project routes
const router = Router({ mergeParams: true });

// All planning routes require authentication
router.use(authenticate);

// GET /projects/:projectId/plans/active
router.get("/active", getActiveDraft);

// POST /projects/:projectId/plans
router.post("/", validate(generatePlanSchema), generatePlan);

// GET /projects/:projectId/plans/:draftId
router.get("/:draftId", getDraft);

// PATCH /projects/:projectId/plans/:draftId
router.patch("/:draftId", validate(updatePlanSchema), updateDraft);

// DELETE /projects/:projectId/plans/:draftId
router.delete("/:draftId", discardDraft);

// POST /projects/:projectId/plans/:draftId/commit
router.post("/:draftId/commit", commitDraft);

export default router;
