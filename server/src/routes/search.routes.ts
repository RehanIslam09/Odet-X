import { Router } from "express";
import { authenticate } from "@/middleware/auth.middleware.js";
import { validateQuery } from "@/middleware/validate-query.js";
import { searchRateLimiter } from "@/middleware/search-rate-limit.middleware.js";
import { searchQuerySchema } from "@/validators/search.validator.js";
import { search } from "@/controllers/search.controller.js";

const router = Router();

/**
 * GET /api/v1/search
 * Middleware Chain: authenticate -> searchRateLimiter -> validateQuery(searchQuerySchema) -> search
 */
router.get(
  "/",
  authenticate,
  searchRateLimiter,
  validateQuery(searchQuerySchema),
  search
);

export default router;
