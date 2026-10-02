import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword, createSessionToken, AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validation";
import { recordAuditLog } from "@/lib/audit";
import { LoginRateLimiter, checkRateLimit } from "@/lib/rate-limiter";

// Pre-computed bcrypt dummy hash for constant-time comparison when email is not found
// Prevents timing attacks and email enumeration
const DUMMY_HASH = "$2a$12$4e9dK2P.6hZ1o0X4oE8X3u7A1G9xP3Q4oE8X3u7A1G9xP3Q4oE8X3u";

export async function POST(request: Request) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  // 1. General IP throttle to prevent DoS
  const throttle = checkRateLimit(`login-req:${clientIp}`, 30, 60);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: "Too many login requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(throttle.resetInSeconds) } }
    );
  }

  // 2. Brute-force protection check
  const rateLimitStatus = LoginRateLimiter.check(clientIp);
  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed login attempts. Account access is temporarily locked. Please try again in ${Math.ceil(
          rateLimitStatus.retryAfterSeconds / 60
        )} minutes.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitStatus.retryAfterSeconds) },
      }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      LoginRateLimiter.recordFailure(clientIp);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }

    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      LoginRateLimiter.recordFailure(clientIp);
      await recordAuditLog({
        action: "LOGIN_FAILED",
        details: "Invalid format in login attempt payload",
        ipAddress: clientIp,
      });

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // Query user with explicit select (never leak passwordHash beyond authentication)
    const user = await db.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    // If user not found or inactive, perform dummy comparison to prevent timing enumeration
    if (!user || user.isActive === false) {
      await comparePassword(password, DUMMY_HASH);
      const failure = LoginRateLimiter.recordFailure(clientIp);

      await recordAuditLog({
        action: "LOGIN_FAILED",
        details: `Failed login attempt for non-existent or inactive user: ${cleanEmail}`,
        ipAddress: clientIp,
      });

      if (failure.lockedOut) {
        return NextResponse.json(
          {
            error: `Too many failed login attempts. Access locked for 15 minutes.`,
          },
          { status: 429, headers: { "Retry-After": String(failure.retryAfterSeconds) } }
        );
      }

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const isMatch = await comparePassword(password, user.passwordHash);

    if (!isMatch) {
      const failure = LoginRateLimiter.recordFailure(clientIp);

      await recordAuditLog({
        userId: user.id,
        action: "LOGIN_FAILED",
        details: `Incorrect password entered for user ${user.email}`,
        ipAddress: clientIp,
      });

      if (failure.lockedOut) {
        return NextResponse.json(
          {
            error: `Too many failed login attempts. Access locked for 15 minutes.`,
          },
          { status: 429, headers: { "Retry-After": String(failure.retryAfterSeconds) } }
        );
      }

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Successful login: reset failed login counter
    LoginRateLimiter.reset(clientIp);

    // Create session token with minimal identity claims
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Record audit log
    await recordAuditLog({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      details: `User ${user.email} (${user.role}) authenticated successfully`,
      ipAddress: clientIp,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Determine cookie security:
    // In production HTTPS deployments, secure flag is mandatory.
    // For localhost development or local production builds, allow plain HTTP cookies so sessions work properly.
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isHttps = forwardedProto === "https" || request.url.startsWith("https://");
    const host = request.headers.get("host") || "";
    const isLocal =
      host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      clientIp === "127.0.0.1" ||
      clientIp === "::1";

    const isSecure = process.env.NODE_ENV === "production" ? (isHttps || !isLocal) : isHttps;

    // Set secure HTTP-only session cookie
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error: any) {
    // Redact connection strings, passwords, or secrets from server diagnostics
    const errorName = error?.name || "AuthenticationError";
    const rawMessage = typeof error?.message === "string" ? error.message : "";
    const safeMessage = rawMessage
      .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[REDACTED]@")
      .replace(/password[:=]\s*\S+/gi, "password=[REDACTED]");

    console.error(`[Auth Error] [${errorName}]: ${safeMessage || "Server execution failure"}`);

    return NextResponse.json(
      { error: "Authentication service error. Please try again." },
      { status: 500 }
    );
  }
}
