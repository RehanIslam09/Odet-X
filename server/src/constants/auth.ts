export const BCRYPT_SALT_ROUNDS = 12;

// Access tokens are short-lived to limit the blast radius of a leaked token.
export const ACCESS_TOKEN_EXPIRES_IN = "15m";

// Refresh tokens are long-lived. REFRESH_TOKEN_MAX_AGE_MS is the single source
// of truth used by both the JWT signing options and the cookie maxAge so they
// stay in sync automatically.
export const REFRESH_TOKEN_EXPIRES_IN = "7d";
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 50;

export const MAX_BIO_LENGTH = 250;