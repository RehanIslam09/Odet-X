import { Router } from "express";
import rateLimit from "express-rate-limit";

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

// Configure rate limits. We bypass these in test mode so we don't break the test suite.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  message: { success: false, message: "Too many login attempts, please try again after 15 minutes" },
  skip: () => process.env.NODE_ENV === "test",
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 registration requests per window
  message: { success: false, message: "Too many accounts created from this IP, please try again after 15 minutes" },
  skip: () => process.env.NODE_ENV === "test",
});

// Public routes
router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);

// Protected routes
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;