import { NextResponse } from "next/server";
import { VerificationService } from "@/features/verification/verification.service";
import { checkRateLimit } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rate = checkRateLimit(clientIp, 30, 60);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait before attempting further verifications.",
          resetInSeconds: rate.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.resetInSeconds),
          },
        }
      );
    }

    const { recordId } = await params;
    const decodedId = decodeURIComponent(recordId);

    const result = await VerificationService.verify(decodedId, clientIp);

    if (result.status === "NOT_FOUND") {
      return NextResponse.json(
        {
          isValid: false,
          status: "NOT_FOUND",
          message: "CERTIFICATE NOT FOUND",
        },
        { status: 404 }
      );
    }

    if (result.status === "REVOKED") {
      return NextResponse.json(
        {
          isValid: false,
          status: "REVOKED",
          message: "CERTIFICATE REVOKED",
          certificate: result.certificate,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Verification API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process verification request" },
      { status: 500 }
    );
  }
}
