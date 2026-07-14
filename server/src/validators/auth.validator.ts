import { z } from "zod";

import {
  MAX_BIO_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/constants/auth.js";

/**
 * Validation schema for POST /auth/register.
 *
 * Rules are derived from the same constants used by the Mongoose model to
 * ensure the two sources of validation can never diverge silently.
 *
 * Note: Zod v4 replaced `required_error` with the `error` param.
 */
export const registerSchema = z.object({
  name: z
    .string({ error: "Name is required." })
    .trim()
    .min(MIN_NAME_LENGTH, `Name must be at least ${MIN_NAME_LENGTH} characters.`)
    .max(MAX_NAME_LENGTH, `Name must be at most ${MAX_NAME_LENGTH} characters.`),

  email: z
    .string({ error: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),

  password: z
    .string({ error: "Password is required." })
    .min(
      MIN_PASSWORD_LENGTH,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
    .max(
      MAX_PASSWORD_LENGTH,
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
    ),
});

/**
 * Validation schema for POST /auth/login.
 */
export const loginSchema = z.object({
  email: z
    .string({ error: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),

  password: z.string({ error: "Password is required." }).min(1, "Password is required."),
});

/**
 * Shared bio field schema (used by update profile in the future).
 */
export const bioSchema = z
  .string()
  .max(MAX_BIO_LENGTH, `Bio must be at most ${MAX_BIO_LENGTH} characters.`)
  .optional();

// DTOs inferred from schemas — single source of truth.
export type RegisterUserDto = z.infer<typeof registerSchema>;
export type LoginUserDto = z.infer<typeof loginSchema>;
