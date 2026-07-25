import crypto from "crypto";
import { env } from "@/config/env.js";
import { UnauthorizedError, BadRequestError } from "@/utils/app-error.js";
import { AllowedActionType } from "@/ai/actions/action.types.js";

// 5 Minutes token lifetime in seconds
export const COPILOT_ACTION_TOKEN_TTL_SECONDS = 300;

export interface CopilotActionTokenPayload {
  actionType: AllowedActionType;
  projectId: string;
  userId: string;
  targetId: string;
  targetRef: string;
  expectedVersion: number | null;
  arguments: Record<string, unknown>;
  explanation: string;
  nonce: string;
  iat: number;
  exp: number;
}

function getSecret(): string {
  return process.env.COPILOT_ACTION_SECRET || env.JWT_ACCESS_SECRET || "copilot-action-signing-secret-fallback";
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

function computeSignature(payloadBase64: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Generates an HMAC-SHA256 signed, short-lived confirmation token for an AI action proposal.
 */
export function generateConfirmationToken(
  params: Omit<CopilotActionTokenPayload, "iat" | "exp" | "nonce"> & { nonce?: string },
): { token: string; expiresAt: string; nonce: string } {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + COPILOT_ACTION_TOKEN_TTL_SECONDS;
  const nonce = params.nonce || crypto.randomUUID();

  const payload: CopilotActionTokenPayload = {
    ...params,
    nonce,
    iat,
    exp,
  };

  const payloadString = JSON.stringify(payload);
  const payloadBase64 = base64UrlEncode(payloadString);
  const signature = computeSignature(payloadBase64, getSecret());

  const token = `${payloadBase64}.${signature}`;
  const expiresAt = new Date(exp * 1000).toISOString();

  return { token, expiresAt, nonce };
}

/**
 * Verifies the HMAC-SHA256 signature and expiration of a confirmation token.
 * Throws UnauthorizedError or BadRequestError if invalid, tampered, or expired.
 */
export function verifyConfirmationToken(token: string): CopilotActionTokenPayload {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    throw new BadRequestError("Invalid confirmation token format.");
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new BadRequestError("Invalid confirmation token structure.");
  }

  const payloadBase64 = parts[0];
  const signature = parts[1];
  const expectedSignature = computeSignature(payloadBase64, getSecret());

  // Timing-safe signature comparison
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new UnauthorizedError("Invalid or tampered action confirmation token.");
  }

  let payload: CopilotActionTokenPayload;
  try {
    const decodedJson = base64UrlDecode(payloadBase64);
    payload = JSON.parse(decodedJson);
  } catch {
    throw new BadRequestError("Malformed action confirmation token payload.");
  }

  if (!payload || typeof payload !== "object" || !payload.nonce || !payload.targetRef || !payload.actionType) {
    throw new BadRequestError("Malformed action confirmation token payload structure.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || now > payload.exp) {
    throw new UnauthorizedError("Action confirmation token has expired.");
  }

  return payload;
}
