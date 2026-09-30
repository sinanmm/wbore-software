import { SignJWT, jwtVerify } from "jose";
import { Role } from "@prisma/client";

export const AUTH_COOKIE_NAME = "wbre_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string;
}

/**
 * Returns the cryptographically secure JWT secret from the environment.
 * FAILS CLOSED: If JWT_SECRET is missing, an explicit error is thrown.
 * No hardcoded fallback secret is ever used.
 */
export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error(
      "FATAL SECURITY ERROR: JWT_SECRET environment variable is missing. Failed closed."
    );
  }
  if (secret.length < 32) {
    throw new Error(
      "FATAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Creates a signed JWT session token with minimal identity claims.
 * Never stores passwords, hashes, or sensitive candidate details.
 */
export async function createSessionToken(payload: Omit<SessionPayload, "exp" | "iat" | "iss" | "aud">): Promise<string> {
  const secretKey = getJwtSecretKey();

  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("wbre-admin-auth")
    .setAudience("wbre-admin-console")
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);
}

/**
 * Verifies a JWT session token signature and expiration.
 * Safe for execution in Next.js Edge Middleware and Node runtime.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: "wbre-admin-auth",
      audience: "wbre-admin-console",
    });

    if (
      !payload.userId ||
      !payload.email ||
      !payload.role ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }

    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
