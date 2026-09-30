import React from "react";
import { CertificateService } from "@/features/certificates/certificate.service";
import { CertificateRegistryView } from "@/components/admin/certificate-registry-view";
import { getSession } from "@/lib/auth";
import { canViewCertificates } from "@/lib/rbac";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: "ALL" | "VALID" | "REVOKED";
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function AdminCertificatesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  if (!canViewCertificates(session.role)) {
    redirect("/admin/unauthorized");
  }

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1", 10) || 1;
  const search = resolvedParams.search || "";
  const status = resolvedParams.status || "ALL";
  const category = resolvedParams.category || "";
  const dateFrom = resolvedParams.dateFrom || undefined;
  const dateTo = resolvedParams.dateTo || undefined;

  let registryData = {
    certificates: [] as any[],
    counts: { total: 0, valid: 0, revoked: 0 },
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  };

  try {
    registryData = await CertificateService.getCertificatesPaged({
      page,
      limit: 20,
      search,
      status,
      category,
      dateFrom,
      dateTo,
    });
  } catch (err) {
    console.error("Failed to load certificate registry:", err);
  }

  return (
    <CertificateRegistryView
      certificates={registryData.certificates}
      counts={registryData.counts}
      pagination={registryData.pagination}
      userRole={session.role}
    />
  );
}
