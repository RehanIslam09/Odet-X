import { createHash } from "crypto";

/**
 * Creates a deterministic SHA-256 hash of a token.
 *
 * Used for storing refresh tokens in the database. We use SHA-256 rather than
 * bcrypt because refresh tokens are already cryptographically high-entropy JWTs
 * — we do not need a slow KDF here. SHA-256 is fast, deterministic, and
 * sufficient to prevent database compromise from yielding usable tokens.
 *
 * Never use this for passwords. Passwords are low-entropy user input and
 * require bcrypt (or Argon2) for proper protection.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
