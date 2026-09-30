import { z } from "zod";

export const applicationSubmissionSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name too long"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(6, "Phone number must be at least 6 characters")
    .max(30, "Phone number too long"),
  country: z.string().min(2, "Country is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  category: z.string().min(2, "Category / Segment is required"),
  achievementTitle: z
    .string()
    .min(3, "Achievement title must be at least 3 characters")
    .max(200, "Achievement title too long"),
  description: z
    .string()
    .min(15, "Description must be at least 15 characters")
    .max(5000, "Description cannot exceed 5000 characters"),
  place: z.string().min(2, "Place / Location is required"),
  supportingDetails: z.string().optional().default(""),
});

export type ApplicationSubmissionInput = z.infer<typeof applicationSubmissionSchema>;

export const verifyQuerySchema = z.object({
  recordId: z
    .string()
    .min(3, "Record ID or Certificate Number is required")
    .trim(),
});

export const adminLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address").trim(),
  password: z.string().min(1, "Password is required"),
});

/**
 * Valid statuses that can be requested via API mutation.
 * CERTIFICATE_GENERATED cannot be directly requested by a client.
 */
export const updateApplicationStatusSchema = z
  .object({
    status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]),
    internalNotes: z.string().max(10000).optional(),
    rejectionReason: z.string().max(2000).optional(),
    requestedInfo: z.string().max(2000).optional(),
  })
  .refine(
    (data) => {
      if (data.status === "REJECTED") {
        return !!data.rejectionReason && data.rejectionReason.trim().length > 0;
      }
      return true;
    },
    {
      message: "A rejection reason is required when rejecting an application.",
      path: ["rejectionReason"],
    }
  );

export const createUserSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").max(100).trim(),
  email: z.string().email("Please enter a valid email address").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters long").max(128),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "VERIFICATION_OFFICER"]),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "VERIFICATION_OFFICER"]),
});

export const generateCertificateSchema = z.object({
  applicationId: z.string().min(1, "applicationId is required").trim(),
});

export const saveNotesSchema = z.object({
  notes: z.string().max(10000, "Notes cannot exceed 10000 characters"),
});

export const revokeCertificateSchema = z.object({
  reason: z
    .string()
    .min(1, "Revocation reason is mandatory")
    .refine((val) => val.trim().length > 0, "Revocation reason cannot be empty or whitespace only")
    .transform((val) => val.trim()),
});

export const certificateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional().default(""),
  status: z.enum(["ALL", "VALID", "REVOKED"]).optional().default("ALL"),
  category: z.string().optional().default(""),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

