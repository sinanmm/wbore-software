import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, AUTH_COOKIE_NAME } from "@/lib/session";
import { Role } from "@/types";

/**
 * Next.js Edge Middleware for Admin Route and Sensitive API Protection
 *
 * Rules:
 * 1. /admin/login remains public.
 * 2. Unauthenticated visits to /admin or /admin/* redirect to /admin/login.
 * 3. Authenticated visits to /admin/login redirect to /admin/dashboard.
 * 4. Unauthenticated requests to protected admin APIs return 401 JSON.
 * 5. Direct access to /uploads/evidence/* is blocked with 403.
 * 6. Public application routes (/apply, /verify, /certificate/*, POST /api/applications) remain unaffected.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block direct public access to raw evidence files
  if (pathname.startsWith("/uploads/evidence/")) {
    return NextResponse.json(
      {
        error:
          "Forbidden: Evidence files are protected and cannot be accessed via direct public URLs. Please access them through authenticated application endpoints.",
      },
      { status: 403 }
    );
  }

  const isLoginPage = pathname === "/admin/login" || pathname === "/login";
  const isAdminRoot = pathname === "/admin";
  const isAdminSubRoute = pathname.startsWith("/admin/");

  // Verify session cookie
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // 1. Login page routing
  if (isLoginPage) {
    if (session) {
      // Authenticated admin accessing login page -> redirect to dashboard
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    // Allow unauthenticated visitors to reach login page
    return NextResponse.next();
  }

  // 2. /admin root route
  if (isAdminRoot) {
    if (session) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // 3. Protected /admin/* routes
  if (isAdminSubRoute) {
    if (!session) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Role-specific protection for /admin/users: only SUPER_ADMIN
    if (pathname.startsWith("/admin/users") && session.role !== Role.SUPER_ADMIN) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // 4. Protected API routes
  const isProtectedApiRoute =
    pathname.startsWith("/api/certificates") ||
    pathname.startsWith("/api/users") ||
    (pathname.startsWith("/api/applications/") && pathname !== "/api/applications");

  if (isProtectedApiRoute && !session) {
    return NextResponse.json(
      { error: "Unauthorized: Active admin session required" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/login",
    "/api/users",
    "/api/users/:path*",
    "/api/certificates",
    "/api/certificates/:path*",
    "/api/applications/:path*",
    "/uploads/evidence/:path*",
  ],
};
