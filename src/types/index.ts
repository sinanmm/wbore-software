import { Role, ApplicationStatus } from "@prisma/client";

export type { Role, ApplicationStatus };

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ApplicationDetail {
  id: string;
  applicationNumber: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  country: string;
  address: string;
  category: string;
  achievementTitle: string;
  description: string;
  place: string;
  supportingDetails?: string | null;
  status: ApplicationStatus;
  internalNotes?: string | null;
  rejectionReason?: string | null;
  requestedInfo?: string | null;
  createdAt: Date;
  updatedAt: Date;
  evidenceFiles?: EvidenceFileSummary[];
  certificate?: CertificateSummary | null;
}

export interface EvidenceFileSummary {
  id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: Date;
}

export interface CertificateSummary {
  id: string;
  recordId: string;
  certificateNumber: string;
  recipientName: string;
  category: string;
  achievementTitle: string;
  place: string;
  issueDate: Date;
  pdfUrl: string;
  qrCodeUrl?: string | null;
  verificationUrl?: string | null;
  generatedAt: Date;
}
