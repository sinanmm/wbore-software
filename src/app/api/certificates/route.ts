import { NextResponse } from "next/server";
import { CertificateService } from "@/features/certificates/certificate.service";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const certificates = await CertificateService.getAllCertificates(limit);
    return NextResponse.json(certificates);
  } catch (error: any) {
    console.error("Fetch certificates error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}
