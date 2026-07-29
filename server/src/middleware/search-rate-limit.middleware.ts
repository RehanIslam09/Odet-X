import rateLimit from "express-rate-limit";
import { Request } from "express";

/**
 * Search-specific rate limiter middleware matching Gate 1 contract:
 * 30 requests per minute per authenticated user.
 */
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request) => {
    if (req.user?._id) {
      return (req.user._id as { toString(): string }).toString();
    }
    return req.ip || "unknown";
  },
  message: {
    success: false,
    message: "Too many search requests, please try again after a minute.",
  },
  skip: (req: Request) => {
    if (process.env.NODE_ENV === "test" && !req.headers["x-test-rate-limit"]) {
      return true;
    }
    return false;
  },
});
