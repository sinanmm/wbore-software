// In-memory rate limiting service for public endpoints and admin authentication brute-force protection.
// In multi-instance production environments (e.g. distributed Coolify or multi-container clusters),
// this service can be backed by Redis or another distributed store without modifying authentication routes.

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired records periodically
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap.entries()) {
      if (val.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupTimer && typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}

/**
 * Standard sliding-window rate limiter for general endpoints (e.g. public verification queries).
 */
export function checkRateLimit(
  ip: string,
  limit = 30,
  windowSeconds = 60
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || record.resetAt <= now) {
    rateLimitMap.set(ip, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return { allowed: true, remaining: limit - 1, resetInSeconds: windowSeconds };
  }

  if (record.count >= limit) {
    const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  record.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  return { allowed: true, remaining: limit - record.count, resetInSeconds };
}

/**
 * Dedicated Brute-Force Protection Service for Admin Login.
 *
 * Rules:
 * - Tracks consecutive failed login attempts per client IP.
 * - Maximum failed attempts: 5.
 * - Lockout window: 15 minutes (900 seconds).
 * - Successful login immediately resets the failed counter.
 */
interface FailedLoginRecord {
  failedAttempts: number;
  lockoutUntil: number;
  firstFailureAt: number;
}

const loginFailureMap = new Map<string, FailedLoginRecord>();

export class LoginRateLimiter {
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Checks if an IP is currently locked out from attempting to log in.
   */
  public static check(ip: string): {
    allowed: boolean;
    remainingAttempts: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    const record = loginFailureMap.get(ip);

    if (!record) {
      return {
        allowed: true,
        remainingAttempts: this.MAX_FAILED_ATTEMPTS,
        retryAfterSeconds: 0,
      };
    }

    // Check if lockout has expired
    if (record.lockoutUntil > now) {
      const retryAfterSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds,
      };
    }

    // Check if the failure window has elapsed
    if (now - record.firstFailureAt > this.FAILURE_WINDOW_MS) {
      loginFailureMap.delete(ip);
      return {
        allowed: true,
        remainingAttempts: this.MAX_FAILED_ATTEMPTS,
        retryAfterSeconds: 0,
      };
    }

    const remaining = Math.max(0, this.MAX_FAILED_ATTEMPTS - record.failedAttempts);
    return {
      allowed: remaining > 0,
      remainingAttempts: remaining,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Records a failed login attempt for the client IP.
   * Activates lockout once MAX_FAILED_ATTEMPTS is reached.
   */
  public static recordFailure(ip: string): {
    lockedOut: boolean;
    remainingAttempts: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    const record = loginFailureMap.get(ip);

    if (!record || now - record.firstFailureAt > this.FAILURE_WINDOW_MS) {
      loginFailureMap.set(ip, {
        failedAttempts: 1,
        lockoutUntil: 0,
        firstFailureAt: now,
      });
      return {
        lockedOut: false,
        remainingAttempts: this.MAX_FAILED_ATTEMPTS - 1,
        retryAfterSeconds: 0,
      };
    }

    record.failedAttempts += 1;

    if (record.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      record.lockoutUntil = now + this.LOCKOUT_DURATION_MS;
      const retryAfterSeconds = Math.ceil(this.LOCKOUT_DURATION_MS / 1000);
      return {
        lockedOut: true,
        remainingAttempts: 0,
        retryAfterSeconds,
      };
    }

    const remaining = this.MAX_FAILED_ATTEMPTS - record.failedAttempts;
    return {
      lockedOut: false,
      remainingAttempts: remaining,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Resets failed attempts upon successful authentication.
   */
  public static reset(ip: string): void {
    loginFailureMap.delete(ip);
  }
}
