import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role } from "@/types";
import {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SessionPayload,
  createSessionToken,
  verifySessionToken,
} from "./session";

export {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
};
export type { SessionPayload };

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/**
 * Retrieves and validates the current active admin session from cookies.
 * Returns null if unauthenticated or if token signature/expiration is invalid.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Enforces authentication and optional role restrictions.
 * Throws UNAUTHORIZED or FORBIDDEN errors if criteria are not met.
 */
export async function requireAuth(allowedRoles?: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
