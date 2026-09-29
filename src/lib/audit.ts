import { db } from "./db";

export interface LogAuditParams {
  userId?: string | null;
  applicationId?: string | null;
  action: string;
  details?: string | null;
  ipAddress?: string | null;
}

export async function recordAuditLog(params: LogAuditParams) {
  try {
    return await db.auditLog.create({
      data: {
        userId: params.userId || null,
        applicationId: params.applicationId || null,
        action: params.action,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
    // Non-blocking: audit logs should not break main user flow if DB is slow
    return null;
  }
}
