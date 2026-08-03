import { Router } from "express";

import {
  acceptInvitationHandler,
  getInvitationByTokenHandler,
} from "@/controllers/workspace-invitation.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";

const router = Router();

// GET /api/v1/invitations/:token - Validate invitation token details (Public)
router.get("/:token", getInvitationByTokenHandler);

// POST /api/v1/invitations/:token/accept - Accept invitation and join workspace (Authenticated)
router.post("/:token/accept", authenticate, acceptInvitationHandler);

export default router;
