import React from "react";
import { notFound } from "next/navigation";
import { ApplicationService } from "@/features/applications/application.service";
import { ApplicationReviewView } from "@/components/admin/application-review-view";

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
  const application = await ApplicationService.getApplicationById(id);

  if (!application) {
    notFound();
  }

  return <ApplicationReviewView initialApplication={application} />;
}
