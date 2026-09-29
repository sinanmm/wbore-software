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
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "CERTIFICATE_GENERATED",
  ]),
  internalNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  requestedInfo: z.string().optional(),
});
