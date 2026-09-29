import React from "react";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "PENDING":
      return <Badge variant="warning">PENDING</Badge>;
    case "UNDER_REVIEW":
      return <Badge variant="secondary">UNDER REVIEW</Badge>;
    case "APPROVED":
      return <Badge variant="success">APPROVED</Badge>;
    case "CERTIFICATE_GENERATED":
      return <Badge variant="gold">CERTIFICATE ISSUED</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">REJECTED</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
