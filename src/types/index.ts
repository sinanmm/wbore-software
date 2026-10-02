export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "REVIEWER"
  | "ADJUDICATOR"
  | "CONTENT_MANAGER"
  | "VERIFICATION_OFFICER"
  | (string & {});

export const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  REVIEWER: "REVIEWER",
  ADJUDICATOR: "ADJUDICATOR",
  CONTENT_MANAGER: "CONTENT_MANAGER",
  VERIFICATION_OFFICER: "REVIEWER", // backwards compatible alias
} as const;

export type ApplicationStatus =
  | "SUBMITTED"
  | "PENDING"
  | "UNDER_INITIAL_REVIEW"
  | "UNDER_REVIEW"
  | "GUIDELINES_ISSUED"
  | "ATTEMPT_SCHEDULED"
  | "EVIDENCE_SUBMITTED"
  | "UNDER_VERIFICATION"
  | "APPROVED"
  | "CERTIFICATE_GENERATED"
  | "REJECTED"
  | "MORE_INFORMATION_REQUIRED"
  | (string & {});

export const ApplicationStatus = {
  SUBMITTED: "SUBMITTED",
  PENDING: "SUBMITTED", // alias
  UNDER_INITIAL_REVIEW: "UNDER_INITIAL_REVIEW",
  UNDER_REVIEW: "UNDER_INITIAL_REVIEW", // alias
  GUIDELINES_ISSUED: "GUIDELINES_ISSUED",
  ATTEMPT_SCHEDULED: "ATTEMPT_SCHEDULED",
  EVIDENCE_SUBMITTED: "EVIDENCE_SUBMITTED",
  UNDER_VERIFICATION: "UNDER_VERIFICATION",
  APPROVED: "APPROVED",
  CERTIFICATE_GENERATED: "APPROVED", // alias
  REJECTED: "REJECTED",
  MORE_INFORMATION_REQUIRED: "MORE_INFORMATION_REQUIRED",
} as const;

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationEvidenceSummary {
  id: string;
  applicationId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  storageProvider: string;
  evidenceCategory: string;
  uploadedBy: string;
  status: string; // PENDING, APPROVED, REJECTED
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Backward-compatibility alias
export type EvidenceFileSummary = ApplicationEvidenceSummary;

export interface CertificateSummary {
  id: string;
  certificateNumber: string;
  recordId: string; // foreign key or canonical string
  recipientName: string;
  recordTitle: string;
  achievementResult: string;
  achievementDate: Date;
  issueDate: Date;
  location: string;
  verificationCode: string;
  qrCodeDataUrl?: string | null;
  status: string; // ACTIVE, REVOKED, REPLACED
  createdAt: Date;
  updatedAt: Date;
  
  // Backwards-compatible aliases for admin views
  applicationId?: string;
  category?: string;
  achievementTitle?: string;
  place?: string;
  pdfUrl?: string;
  certificatePdfUrl?: string;
  verificationStatus?: string;
  verificationUrl?: string | null;
  qrCodeUrl?: string | null;
  generatedAt?: Date;
  record?: any;
  application?: any;
}

export interface RecordSummary {
  id: string;
  recordId: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  resultValue: string;
  measurementUnit: string;
  recordDate: Date;
  verificationDate: Date;
  country: string;
  location: string;
  status: string;
  categoryId: string;
  categoryName?: string;
  certificateNumber?: string | null;
  certificates?: CertificateSummary[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationDetail {
  id: string;
  applicationNumber: string;
  applicantType: string;
  applicantName: string;
  organizationName?: string | null;
  email: string;
  phone: string;
  country: string;
  stateRegion?: string | null;
  city: string;
  proposedTitle: string;
  categoryName: string;
  description: string;
  measuredMetric: string;
  knownBenchmark?: string | null;
  significance: string;
  proposedDate?: Date | null;
  location: string;
  expectedParticipants?: number | null;
  attemptType: string;
  evidencePlan: string;
  additionalNotes?: string | null;
  status: string;
  assignedReviewerId?: string | null;
  internalNotes?: string | null;
  guidelinesDocument?: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  evidences?: ApplicationEvidenceSummary[];
  statusHistory?: {
    id: string;
    status: string;
    note?: string | null;
    updatedBy?: string | null;
    createdAt: Date;
  }[];
  record?: RecordSummary | null;
  certificate?: CertificateSummary | null;
  
  // Compatibility fields for existing admin UI
  applicantEmail: string;
  applicantPhone: string;
  category: string;
  achievementTitle: string;
  place: string;
  address: string;
  supportingDetails?: string | null;
  rejectionReason?: string | null;
  requestedInfo?: string | null;
  evidenceFiles?: ApplicationEvidenceSummary[];
}
