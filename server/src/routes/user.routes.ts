import { Router } from "express";

import {
  updatePassword,
  updatePreferences,
  updateProfile,
} from "@/controllers/user.controller.js";
import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";
import {
  changePasswordSchema,
  updatePreferencesSchema,
  updateProfileSchema,
} from "@/validators/user.validator.js";

const router = Router();

// All settings routes require authentication
router.use(authenticate);

router.patch("/me", validate(updateProfileSchema), updateProfile);
router.patch("/preferences", validate(updatePreferencesSchema), updatePreferences);
router.patch("/password", validate(changePasswordSchema), updatePassword);

export default router;
