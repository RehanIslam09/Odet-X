/**
 * Redis client initialization (using ioredis).
 *
 * Redis is planned for:
 * - Rate limiting (express-rate-limit + rate-limit-redis)
 * - Session blacklisting (token revocation at scale)
 * - Caching expensive queries
 *
 * TODO: Install dependency — `npm install ioredis`
 * TODO: Add required env vars to config/env.ts:
 *   - REDIS_URL (e.g. redis://localhost:6379)
 *
 * Usage (future):
 * ```ts
 * import { redis } from "@/lib/redis.js";
 * await redis.set("key", "value", "EX", 3600);
 * const value = await redis.get("key");
 * ```
 */

// import Redis from "ioredis";
// import { env } from "@/config/env.js";
//
// export const redis = new Redis(env.REDIS_URL, {
//   maxRetriesPerRequest: 3,
//   lazyConnect: true,
// });
//
// redis.on("error", (err) => {
//   console.error("[Redis] Connection error:", err);
// });

export {};
