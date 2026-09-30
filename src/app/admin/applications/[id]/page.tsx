import React from "react";
import { notFound } from "next/navigation";
import { ApplicationService } from "@/features/applications/application.service";
import { ApplicationReviewView } from "@/components/admin/application-review-view";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Review Application ${id} | WBRE Adjudication`,
  };
}

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [application, session] = await Promise.all([
    ApplicationService.getApplicationById(id),
    getSession(),
  ]);

  if (!application) {
    notFound();
  }

  if (session) {
    await recordAuditLog({
      userId: session.userId,
      applicationId: application.id,
      action: "APPLICATION_VIEWED",
      details: `Application ${application.applicationNumber} viewed by ${session.role}`,
    });
  }

  return (
    <ApplicationReviewView
      initialApplication={application}
      currentUserRole={session?.role}
    />
  );
}
