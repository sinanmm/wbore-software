import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs/promises";
import { CertificateGenerator } from "../src/features/certificates/certificate.generator";
import { formatDate } from "../src/lib/utils";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding WBRE Certificate Management System database...");

  // 1. Create Default Admin User
  const passwordHash = await bcrypt.hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@wbore.org" },
    update: { passwordHash },
    create: {
      name: "WBRE Super Administrator",
      email: "admin@wbore.org",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log("Created/Updated admin user:", adminUser.email);

  // 2. Create Sample Approved Record with Issued Certificate
  const app1 = await prisma.application.upsert({
    where: { applicationNumber: "APP-2026-000101" },
    update: {},
    create: {
      applicationNumber: "APP-2026-000101",
      applicantName: "Dr. Arthur S. Pendleton",
      applicantEmail: "arthur.pendleton@aerosolar.org",
      applicantPhone: "+971 50 123 4567",
      country: "United Arab Emirates",
      address: "Dubai Silicon Oasis, Technology Park, Dubai, UAE",
      category: "Technology & Innovation",
      achievementTitle: "Autonomous Solar Drone Longest High-Altitude Endurance",
      description:
        "Engineered and successfully piloted the SolarStrato-X unmanned solar-powered aerial vehicle continuously for 82 days in stratospheric flight without landing or refueling.",
      place: "Dubai, United Arab Emirates",
      supportingDetails:
        "Official telemetry logs validated by UAE Civil Aviation and international GPS surveyor beacons.",
      status: "CERTIFICATE_GENERATED",
      internalNotes: "All telemetry logs and autonomous battery metrics validated by Chief Adjudicator.",
    },
  });

  // Generate certificate PDF for the sample record
  const recordId = "WBRE-TEC-2026-000101";
  const certificateNumber = "WBRE-CERT-2026-000101";
  const issueDateFormatted = formatDate(new Date());

  const certGen = await CertificateGenerator.generate({
    recipientName: app1.applicantName,
    category: app1.category,
    achievementTitle: app1.achievementTitle,
    place: app1.place,
    recordId,
    certificateNumber,
    dateOfRecognition: issueDateFormatted,
    verificationUrl: `http://localhost:3000/verify?recordId=${recordId}`,
  });

  await prisma.certificate.upsert({
    where: { applicationId: app1.id },
    update: {
      pdfUrl: certGen.pdfUrl,
      qrCodeUrl: certGen.qrCodeDataUrl,
    },
    create: {
      applicationId: app1.id,
      recordId,
      certificateNumber,
      recipientName: app1.applicantName,
      category: app1.category,
      achievementTitle: app1.achievementTitle,
      place: app1.place,
      issueDate: new Date(),
      pdfUrl: certGen.pdfUrl,
      qrCodeUrl: certGen.qrCodeDataUrl,
      verificationUrl: `http://localhost:3000/verify?recordId=${recordId}`,
    },
  });
  console.log(`Created certificate ${certificateNumber} (${recordId})`);

  // 3. Create Sample Pending Applications for Adjudication Testing
  const pendingApps = [
    {
      num: "APP-2026-000102",
      name: "Elena Rostova",
      email: "elena.rostova@oceanic.org",
      phone: "+33 6 12 34 56 78",
      country: "France",
      address: "14 Rue de la Marine, Marseille, France",
      category: "Sports & Athletics",
      title: "Deepest Autonomous Free Dive in Arctic Waters",
      desc: "Completed single-breath free dive to a calibrated depth of 132 meters in sub-zero Arctic waters off Tromsø without auxiliary thermal suits.",
      place: "Tromsø, Norway",
      status: "PENDING" as const,
    },
    {
      num: "APP-2026-000103",
      name: "Marcus Aurelius Vance",
      email: "marcus.vance@quantumcore.io",
      phone: "+1 415 555 0199",
      country: "United States",
      address: "500 Howard Street, San Francisco, CA, USA",
      category: "Science & Research",
      title: "Room-Temperature Quantum Coherence Sustained Over 120 Seconds",
      desc: "Demonstrated sustained quantum superposition and error-corrected logical qubit coherence at 294 Kelvin using diamond nitrogen-vacancy lattice matrices.",
      place: "Cambridge, Massachusetts",
      status: "UNDER_REVIEW" as const,
    },
  ];

  for (const p of pendingApps) {
    await prisma.application.upsert({
      where: { applicationNumber: p.num },
      update: {},
      create: {
        applicationNumber: p.num,
        applicantName: p.name,
        applicantEmail: p.email,
        applicantPhone: p.phone,
        country: p.country,
        address: p.address,
        category: p.category,
        achievementTitle: p.title,
        description: p.desc,
        place: p.place,
        status: p.status,
      },
    });
  }

  // 4. Create Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: "SYSTEM_INITIALIZED",
      details: "WBRE Certificate Management System initialized and seeded.",
    },
  });

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
