import { NextResponse } from "next/server";
import { CertificateService } from "@/features/certificates/certificate.service";
import { getSession } from "@/lib/auth";
import { canViewCertificates } from "@/lib/rbac";
import { certificateQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Certificate Registry API Endpoint
 * GET /api/certificates
 * 
 * Supports:
 * - Pagination: page, limit
 * - Server-side search: search by Record ID, Certificate Number, Recipient Name, Achievement Title
 * - Server-side filtering: status (VALID, REVOKED), category, dateFrom, dateTo
 * - Summary counts: total, valid, revoked
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canViewCertificates(session.role)) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient privileges to view certificates" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "ALL",
      category: searchParams.get("category") || "",
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    };

    const parsed = certificateQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await CertificateService.getCertificatesPaged(parsed.data);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Fetch certificates registry error:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificates registry." },
      { status: 500 }
    );
  }
}
