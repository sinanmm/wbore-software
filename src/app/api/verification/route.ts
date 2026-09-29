import { NextResponse } from "next/server";
import { VerificationService } from "@/features/verification/verification.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get("recordId") || searchParams.get("id") || "";

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
