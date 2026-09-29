import { NextResponse } from "next/server";
import { VerificationService } from "@/features/verification/verification.service";
import { checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rate = checkRateLimit(clientIp, 30, 60);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          isValid: false,
          message: "Rate limit exceeded. Please try again shortly.",
          resetInSeconds: rate.resetInSeconds,
        },
        { status: 429, headers: { "Retry-After": String(rate.resetInSeconds) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get("recordId") || searchParams.get("id") || "";

    const result = await VerificationService.verify(recordId, clientIp);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { isValid: false, message: error.message || "Verification service error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const recordId = body.recordId || body.id || "";

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const result = await VerificationService.verify(recordId, clientIp);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { isValid: false, message: error.message || "Verification service error" },
      { status: 500 }
    );
  }
}
