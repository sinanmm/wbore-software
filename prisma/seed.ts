import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CertificateGenerator } from "../src/features/certificates/certificate.generator";
import { formatDate } from "../src/lib/utils";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding WBRE Certificate Management System database...");

  // 1. Create Default Users for all Roles
  const passwordHash = await bcrypt.hash("admin123", 12);

  // Super Admin
  const superAdminUser = await prisma.user.upsert({
    where: { email: "superadmin@wbre.org" },
    update: { passwordHash, isActive: true },
    create: {
      name: "Dr. Isabella Martinez",
      email: "superadmin@wbre.org",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@wbore.org" },
    update: { passwordHash, isActive: true },
    create: {
      name: "WBRE Super Administrator",
      email: "admin@wbore.org",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  // Admin Adjudicator
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@wbre.org" },
    update: { passwordHash, isActive: true },
    create: {
      name: "Arthur Vance",
      email: "admin@wbre.org",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  // Reviewer / Verification Officer
  await prisma.user.upsert({
    where: { email: "verify@wbre.org" },
    update: { passwordHash, isActive: true },
    create: {
      name: "Richard Coleman",
      email: "verify@wbre.org",
      passwordHash,
      role: "REVIEWER",
      isActive: true,
    },
  });

  console.log("Created/Updated seed users: SUPER_ADMIN, ADMIN, REVIEWER");

  // 2. Create Record Category
  const techCategory = await prisma.recordCategory.upsert({
    where: { slug: "technology-and-innovation" },
    update: {},
    create: {
      name: "Technology & Innovation",
      slug: "technology-and-innovation",
      description: "Record achievements in technological development, engineering, and digital innovation.",
      iconName: "Cpu",
      displayOrder: 1,
      isActive: true,
    },
  });

  const sportsCategory = await prisma.recordCategory.upsert({
    where: { slug: "sports-and-athletics" },
    update: {},
    create: {
      name: "Sports & Athletics",
      slug: "sports-and-athletics",
      description: "Extraordinary human endurance and sporting achievements.",
      iconName: "Award",
      displayOrder: 2,
      isActive: true,
    },
  });

  const scienceCategory = await prisma.recordCategory.upsert({
    where: { slug: "science-and-research" },
    update: {},
    create: {
      name: "Science & Research",
      slug: "science-and-research",
      description: "Breakthrough scientific experiments and quantum research.",
      iconName: "Atom",
      displayOrder: 3,
      isActive: true,
    },
  });

  // 3. Create Sample Approved Application with Record and Certificate
  const appNumber1 = "WBRE-APP-2026-000101";
  const app1 = await prisma.application.upsert({
    where: { applicationNumber: appNumber1 },
    update: {},
    create: {
      applicationNumber: appNumber1,
      applicantType: "Individual",
      applicantName: "Dr. Arthur S. Pendleton",
      organizationName: "AeroSolar Systems",
      email: "arthur.pendleton@aerosolar.org",
      phone: "+971 50 123 4567",
      country: "United Arab Emirates",
      stateRegion: "Dubai",
      city: "Dubai",
      proposedTitle: "Autonomous Solar Drone Longest High-Altitude Endurance",
      categoryName: techCategory.name,
      description:
        "Engineered and successfully piloted the SolarStrato-X unmanned solar-powered aerial vehicle continuously for 82 days in stratospheric flight without landing or refueling.",
      measuredMetric: "82 days, 14 hours, 22 minutes continuous stratospheric flight",
      knownBenchmark: "Previous international mark was 64 days set in 2022",
      significance:
        "Validates long-term atmospheric satellite capabilities for environmental sensing and zero-carbon telecommunications.",
      proposedDate: new Date("2026-01-15T00:00:00.000Z"),
      location: "Dubai, United Arab Emirates",
      expectedParticipants: 1,
      attemptType: "Individual",
      evidencePlan: JSON.stringify([
        "Telemetry Logs",
        "GPS Tracker Feed",
        "Civil Aviation Radar Data",
        "Witness Statements",
      ]),
      additionalNotes:
        "Official telemetry logs validated by UAE Civil Aviation and international GPS surveyor beacons.",
      status: "APPROVED",
      internalNotes: "All telemetry logs and autonomous battery metrics validated by Chief Adjudicator.",
    },
  });

  // Create Record and Certificate
  const recordId = "WBRE-TEC-2026-000101";
  const certificateNumber = "WBRE-CERT-2026-000101";
  const issueDateFormatted = formatDate(new Date("2026-01-20T00:00:00.000Z"));

  const certGen = await CertificateGenerator.generate({
    recipientName: app1.applicantName,
    category: app1.categoryName,
    achievementTitle: app1.proposedTitle,
    place: app1.location,
    recordId,
    certificateNumber,
    dateOfRecognition: issueDateFormatted,
    verificationUrl: `https://wbore.org/verify?recordId=${recordId}`,
  });

  const recordSlug = "autonomous-solar-drone-longest-high-altitude-endurance-2026";
  const record = await prisma.record.upsert({
    where: { recordId },
    update: {},
    create: {
      recordId,
      slug: recordSlug,
      title: app1.proposedTitle,
      shortDescription:
        "SolarStrato-X unmanned aerial vehicle continuous stratospheric flight for 82 days.",
      fullDescription: app1.description,
      resultValue: "82 days, 14 hours, 22 minutes",
      measurementUnit: "days",
      recordDate: new Date("2026-01-15T00:00:00.000Z"),
      verificationDate: new Date("2026-01-20T00:00:00.000Z"),
      country: app1.country,
      location: app1.location,
      status: "ACTIVE",
      categoryId: techCategory.id,
      certificateNumber,
    },
  });

  const cert = await prisma.certificate.upsert({
    where: { certificateNumber },
    update: {
      qrCodeDataUrl: certGen.qrCodeDataUrl,
    },
    create: {
      certificateNumber,
      recordId: record.id,
      recipientName: app1.applicantName,
      recordTitle: app1.proposedTitle,
      achievementResult: "82 days, 14 hours, 22 minutes",
      achievementDate: new Date("2026-01-15T00:00:00.000Z"),
      issueDate: new Date("2026-01-20T00:00:00.000Z"),
      location: app1.location,
      verificationCode: "VER-TEC2026000101",
      qrCodeDataUrl: certGen.qrCodeDataUrl,
      status: "ACTIVE",
    },
  });

  await prisma.recordHistory.upsert({
    where: { id: "seed-history-1" },
    update: {},
    create: {
      id: "seed-history-1",
      recordId: record.id,
      eventDate: new Date("2026-01-20T00:00:00.000Z"),
      eventType: "ESTABLISHED",
      title: "Record Established",
      description: `Official Certificate ${certificateNumber} issued to ${app1.applicantName}`,
    },
  });

  console.log(`Created record ${recordId} and certificate ${cert.certificateNumber}`);

  // 4. Create Sample Applications for Adjudication Testing
  const sampleApps = [
    {
      num: "WBRE-APP-2026-000102",
      name: "Elena Rostova",
      email: "elena.rostova@oceanic.org",
      phone: "+33 6 12 34 56 78",
      country: "France",
      city: "Marseille",
      stateRegion: "Provence-Alpes-Côte d'Azur",
      categoryName: sportsCategory.name,
      title: "Deepest Autonomous Free Dive in Arctic Waters",
      desc: "Completed single-breath free dive to a calibrated depth of 132 meters in sub-zero Arctic waters off Tromsø without auxiliary thermal suits.",
      place: "Tromsø, Norway",
      metric: "132 meters depth",
      status: "SUBMITTED",
    },
    {
      num: "WBRE-APP-2026-000103",
      name: "Marcus Aurelius Vance",
      email: "marcus.vance@quantumcore.io",
      phone: "+1 415 555 0199",
      country: "United States",
      city: "San Francisco",
      stateRegion: "California",
      categoryName: scienceCategory.name,
      title: "Room-Temperature Quantum Coherence Sustained Over 120 Seconds",
      desc: "Demonstrated sustained quantum superposition and error-corrected logical qubit coherence at 294 Kelvin using diamond nitrogen-vacancy lattice matrices.",
      place: "Cambridge, Massachusetts",
      metric: "124.6 seconds at 294 Kelvin",
      status: "UNDER_INITIAL_REVIEW",
    },
  ];

  for (const p of sampleApps) {
    await prisma.application.upsert({
      where: { applicationNumber: p.num },
      update: {},
      create: {
        applicationNumber: p.num,
        applicantType: "Individual",
        applicantName: p.name,
        email: p.email,
        phone: p.phone,
        country: p.country,
        city: p.city,
        stateRegion: p.stateRegion,
        categoryName: p.categoryName,
        proposedTitle: p.title,
        description: p.desc,
        measuredMetric: p.metric,
        significance: p.desc.slice(0, 200),
        location: p.place,
        expectedParticipants: 1,
        attemptType: "Individual",
        evidencePlan: JSON.stringify(["Video recording", "Sensor logs", "Official adjudicator log"]),
        status: p.status,
      },
    });
  }

  // 5. Create Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: superAdminUser.id,
      action: "SYSTEM_INITIALIZED",
      entity: "SYSTEM",
      entityId: "SEED",
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
