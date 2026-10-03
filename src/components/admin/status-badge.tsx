import React from "react";
import { Badge } from "@/components/ui/badge";
import { getStatusLabel } from "@/lib/workflow";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status ? status.trim().toUpperCase() : "";

  switch (normalized) {
    case "EVIDENCE_SUBMITTED":
      return <Badge variant="warning">Evidence Submitted</Badge>;
    case "SUBMITTED":
      return <Badge variant="warning">Submitted</Badge>;
    case "PENDING":
      return <Badge variant="warning">Pending</Badge>;
    case "LODGED":
      return <Badge variant="warning">Lodged</Badge>;
    case "UNDER_REVIEW":
    case "UNDER_INITIAL_REVIEW":
      return <Badge variant="secondary">Under Review</Badge>;
    case "UNDER_VERIFICATION":
      return <Badge variant="secondary">Under Verification</Badge>;
    case "APPROVED":
      return <Badge variant="success">Approved</Badge>;
    case "CERTIFICATE_GENERATED":
      return <Badge variant="gold">Certificate Generated</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>;
    case "MORE_INFORMATION_REQUIRED":
      return <Badge variant="warning">More Info Required</Badge>;
    default:
      return <Badge variant="outline">{getStatusLabel(status)}</Badge>;
  }
}

