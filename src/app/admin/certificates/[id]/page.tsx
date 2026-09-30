import React from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewCertificates } from "@/lib/rbac";
import { CertificateService } from "@/features/certificates/certificate.service";
import { CertificateDetailsView } from "@/components/admin/certificate-details-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminCertificateDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  if (!canViewCertificates(session.role)) {
    redirect("/admin/unauthorized");
  }

  const { id } = await params;
  const cleanId = decodeURIComponent(id || "").trim();

  const certificate = await CertificateService.getCertificateByIdWithHistory(cleanId);
  if (!certificate) {
    notFound();
  }

  return (
    <CertificateDetailsView
      certificate={certificate as any}
      currentUserRole={session.role}
    />
  );
}
