import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function bootstrapAdmin() {
  const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || "superadmin@wbre.org").trim().toLowerCase();
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
  const adminName = (process.env.BOOTSTRAP_ADMIN_NAME || "WBRE Super Administrator").trim();
  const adminRole = "SUPER_ADMIN";

  // 1. Validate inputs
  if (!adminPassword || adminPassword.trim() === "") {
    console.error("ERROR: BOOTSTRAP_ADMIN_PASSWORD environment variable is required.");
    console.error("Usage: BOOTSTRAP_ADMIN_PASSWORD='<secure-password>' npx tsx scripts/bootstrap-admin.ts");
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error("ERROR: BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters long.");
    process.exit(1);
  }

  if (!validateEmail(adminEmail)) {
    console.error(`ERROR: Invalid email format: "${adminEmail}"`);
    process.exit(1);
  }

  try {
    // 2. Idempotency Check: Case-insensitive search for existing user
    const existing = await prisma.user.findFirst({
      where: {
        email: {
          equals: adminEmail,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (existing) {
      console.log("Administrator already exists.");
      console.log(`Email: ${existing.email}`);
      console.log(`Role: ${existing.role}`);
      return;
    }

    // 3. Hash password using the application's existing bcrypt implementation
    const passwordHash = await hashPassword(adminPassword);

    // 4. Create administrator record
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: adminRole,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    // 5. Create audit log entry
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "ADMIN_BOOTSTRAP",
          entity: "USER",
          entityId: user.id,
          details: `Administrator account created for ${adminEmail} with role ${adminRole}`,
        },
      });
    } catch {
      // Non-blocking if audit table has different constraint
    }

    // 6. Report success without printing sensitive information
    console.log("Admin bootstrap successful.");
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
  } catch (error: any) {
    const errorMsg = error?.message || "Unknown error";
    // Never leak database credentials in error output
    const safeError = errorMsg.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[REDACTED]@");
    console.error(`ERROR: Bootstrap failed: ${safeError}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapAdmin();
