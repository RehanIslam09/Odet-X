/**
 * OpenAI client initialization.
 *
 * Used for AI features planned in Phase 7:
 * - AI task generation from project descriptions
 * - AI project planning and sprint estimation
 * - Smart summaries of project activity
 *
 * TODO: Install dependency — `npm install openai`
 * TODO: Add required env vars to config/env.ts:
 *   - OPENAI_API_KEY
 *   - OPENAI_MODEL (e.g. "gpt-4o")
 *
 * Usage (future):
 * ```ts
 * import { openai } from "@/lib/openai.js";
 * const response = await openai.chat.completions.create({
 *   model: env.OPENAI_MODEL,
 *   messages: [{ role: "user", content: prompt }],
 * });
 * ```
 */

// import OpenAI from "openai";
// import { env } from "@/config/env.js";
//
// export const openai = new OpenAI({
//   apiKey: env.OPENAI_API_KEY,
// });

export {};
