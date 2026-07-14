import { Router } from "express";

import {
  login,
  logout,
  me,
  refresh,
  register,
} from "@/controllers/auth.controller.js";

import { authenticate } from "@/middleware/auth.middleware.js";
import { validate } from "@/middleware/validate.js";

import { loginSchema, registerSchema } from "@/validators/auth.validator.js";

const router = Router();

// Public routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);

// Protected routes
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;