import { z } from "zod";

/**
 * Validation constants mirroring the backend auth constants.
 * These are intentionally duplicated (not imported from the server) because
 * they represent the frontend's validation contract, which should be
 * independently maintainable and not coupled to server internals.
 */
const NAME_MIN = 2;
const NAME_MAX = 50;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

// ---------------------------------------------------------------------------
// Register Schema
// ---------------------------------------------------------------------------

/**
 * Validation schema for the registration form.
 * Rules mirror the backend `registerSchema` to provide instant feedback
 * before a network round-trip.
 */
export const registerSchema = z.object({
  name: z
    .string({ error: "Name is required." })
    .trim()
    .min(NAME_MIN, `Name must be at least ${NAME_MIN} characters.`)
    .max(NAME_MAX, `Name must be at most ${NAME_MAX} characters.`),

  email: z
    .string({ error: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),

  password: z
    .string({ error: "Password is required." })
    .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters.`)
    .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters.`),
});

// ---------------------------------------------------------------------------
// Login Schema
// ---------------------------------------------------------------------------

/**
 * Validation schema for the login form.
 * Password validation is intentionally minimal — the server performs
 * the actual credential verification.
 */
export const loginSchema = z.object({
  email: z
    .string({ error: "Email is required." })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),

  password: z
    .string({ error: "Password is required." })
    .min(1, "Password is required."),
});

// ---------------------------------------------------------------------------
// Inferred Types
// ---------------------------------------------------------------------------

/** Inferred from `registerSchema` — single source of truth for the register form values. */
export type RegisterFormValues = z.infer<typeof registerSchema>;

/** Inferred from `loginSchema` — single source of truth for the login form values. */
export type LoginFormValues = z.infer<typeof loginSchema>;
