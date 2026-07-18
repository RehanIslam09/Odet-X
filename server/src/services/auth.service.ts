import User from "@/models/user.model.js";

import type { LoginUserDto, RegisterUserDto } from "@/types/auth.js";
import { ConflictError, UnauthorizedError } from "@/utils/app-error.js";
import { hashToken } from "@/utils/hash.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "@/utils/jwt.js";

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

/**
 * Creates a new user account.
 *
 * Returns the serialized user object (via toJSON) so the controller receives a
 * plain object with no Mongoose internals or sensitive fields.
 */
export async function registerUser(data: RegisterUserDto) {
  const existingUser = await User.findOne({ email: data.email });

  if (existingUser) {
    throw new ConflictError("Email is already registered.");
  }

  // Generate collision-safe unique username in the service layer
  const baseUsername = (data.email.split("@")[0] || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  const candidate = baseUsername || "user";

  let isUnique = false;
  let counter = 1;
  let username = candidate;

  while (!isUnique) {
    const existing = await User.findOne({ username });
    if (!existing) {
      isUnique = true;
    } else {
      counter++;
      username = `${candidate}_${counter}`;
    }
  }

  const user = await User.create({
    ...data,
    username,
  });

  return user.toJSON();
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export interface LoginResult {
  user: ReturnType<InstanceType<typeof User>["toJSON"]>;
  accessToken: string;
  rawRefreshToken: string;
}

/**
 * Validates credentials, issues tokens, and stores a hash of the refresh token.
 *
 * The raw refresh token is returned to the controller so it can set it as an
 * HTTP-only cookie. It is NEVER included in the JSON response body.
 *
 * The database only ever stores `hashToken(rawRefreshToken)` — if the database
 * is compromised, the hashed values cannot be used to make API calls.
 */
export async function loginUser(data: LoginUserDto): Promise<LoginResult> {
  const user = await User.findOne({ email: data.email }).select(
    "+password +refreshTokenHash",
  );

  if (!user) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const isPasswordValid = await user.comparePassword(data.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const userId = (user._id as { toString(): string }).toString();
  const accessToken = generateAccessToken(userId);
  const rawRefreshToken = generateRefreshToken(userId);

  // Store the hash — never the raw token.
  user.refreshTokenHash = hashToken(rawRefreshToken);
  await user.save();

  return {
    user: user.toJSON(),
    accessToken,
    rawRefreshToken,
  };
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

export interface RefreshResult {
  accessToken: string;
  rawRefreshToken: string;
}

/**
 * Validates the incoming refresh token, then rotates it.
 *
 * Rotation means: the old token is immediately invalidated in the database and
 * a brand new token is issued. This limits the window during which a stolen
 * refresh token can be used — as soon as the legitimate user refreshes, the
 * attacker's copy becomes invalid.
 *
 * Steps:
 * 1. Verify JWT signature and expiry.
 * 2. Look up the user by sub claim.
 * 3. Compare the hash of the incoming token against the stored hash.
 * 4. Confirm the user is active.
 * 5. Generate new access + refresh tokens.
 * 6. Store the new hash, invalidating the old token.
 */
export async function refreshAccessToken(
  rawRefreshToken: string,
): Promise<RefreshResult> {
  // Step 1: Verify JWT — throws UnauthorizedError if invalid or expired.
  const payload = verifyRefreshToken(rawRefreshToken);

  // Step 2: Look up user.
  const user = await User.findById(payload.sub).select("+refreshTokenHash");

  if (!user) {
    throw new UnauthorizedError("Authentication required.");
  }

  // Step 3: Compare hashes. The stored hash must match the incoming token's hash.
  // A mismatch means the token was already rotated (possible reuse attack) or
  // the token never belonged to this user.
  const incomingHash = hashToken(rawRefreshToken);

  if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
    // Potential token reuse detected. Clear the stored hash as a precaution —
    // this logs the user out everywhere, forcing a fresh login.
    user.refreshTokenHash = null;
    await user.save();
    throw new UnauthorizedError("Authentication required.");
  }

  // Step 4: Confirm account is active.
  if (!user.isActive) {
    throw new UnauthorizedError("Authentication required.");
  }

  // Step 5: Issue new tokens.
  const refreshUserId = (user._id as { toString(): string }).toString();
  const newAccessToken = generateAccessToken(refreshUserId);
  const newRawRefreshToken = generateRefreshToken(refreshUserId);

  // Step 6: Rotate — store new hash, old token is now invalid.
  user.refreshTokenHash = hashToken(newRawRefreshToken);
  await user.save();

  return {
    accessToken: newAccessToken,
    rawRefreshToken: newRawRefreshToken,
  };
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Invalidates the stored refresh token for the given user.
 *
 * Idempotent: calling this when already logged out is a no-op. The cookie
 * is cleared by the controller regardless.
 */
export async function logoutUser(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
}