# World Book of Record Excellence (WBRE) - Certificate Management System

A production-ready Certificate Management and Record Adjudication platform built with **Next.js 15 App Router**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **PostgreSQL**.

---

## 🌟 Architecture Overview

### 1. Public Portal
- **`/apply`**: Comprehensive multi-step candidate application wizard with personal details, category selection, achievement narrative, benchmark comparisons, and drag-and-drop evidence uploader (supporting Images, PDFs, and Videos up to 50MB). Generates sequential application numbers: `APP-YYYY-XXXXXX` (e.g. `APP-2026-000001`).
- **`/verify`**: Instant public verification lookup supporting Record ID (`WBRE-TEC-2026-000101`) or Certificate Number. Shows validity status, recipient name, category, place, achievement title, recognition date, live A4 certificate preview, and downloadable PDF.
- **`/certificate/[id]`**: Direct canonical certificate viewer with QR verification integration and PDF download streaming.

### 2. Admin Adjudication Software
- **`/admin/dashboard`**: Executive dashboard with KPI counters (Total Applications, Pending Requests, Approved Certificates, Rejected Requests), recent submissions table, latest certificate issuance feed, and complete adjudication audit logs.
- **`/admin/applications`**: Full application management table with live search and status filters (`ALL`, `PENDING`, `UNDER_REVIEW`, `APPROVED`, `CERTIFICATE_GENERATED`, `REJECTED`).
- **`/admin/applications/[id]`**: **3-Column Adjudication Review Suite**:
  - **Left Column**: Full applicant profile, residential address, category, place, achievement title, narrative, and benchmark specifications.
  - **Middle Column**: Evidence viewer with inline image preview, modal zoom, video player, and document downloads.
  - **Right Column**: Adjudication action controls (**Approve Certificate**, **Reject Application**, **Request More Information**) and confidential internal review notes with persistence.
- **`/admin/certificates`**: Central certificate registry with preview, search, and high-resolution PDF download streaming.
- **`/admin/verification`**: Real-time audit logs of global certificate verification attempts with IP tracking and timestamps.
- **`/admin/users`**: Administrator accounts, role management (`SUPER_ADMIN`, `ADMIN`, `REVIEWER`).
- **`/admin/settings`**: Dynamic engine inspection displaying exact vector typography coordinates configured in `certificate-template.ts`.

### 3. Reusable Certificate Generation Engine
- **Base Template**: Official A4 portrait template image (`public/templates/certificate-template.png`, 1055 x 1491 px).
- **Coordinate Configuration**: `certificate-template.ts` defines pixel-accurate coordinates for:
  - Recipient Name (Center aligned, dynamic font autosizing, background-matched watermark neutralization).
  - Category, Achievement Title, Place, Record ID, Certificate Number, Recognition Date.
  - Verification QR Code.
- **Vector Overlay**: Utilizes `pdf-lib` for high-resolution, vector-crisp typography and fast server-side PDF rendering.

---

## 🚀 Getting Started

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/wbore?schema=public"
JWT_SECRET="your-strong-random-jwt-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STORAGE_DRIVER="LOCAL"
```

### 2. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate
```

### 3. Database Migration & Seed
```bash
npx prisma db push
npm run db:seed
```
Default administrator credentials seeded:
- **Email**: `admin@wbore.org`
- **Password**: `admin123`

### 4. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🐳 Coolify / Docker Deployment

This project includes a multi-stage `Dockerfile` and `scripts/start.sh` tailored for Coolify and Dockerized PostgreSQL setups.

### Setup on Coolify:
1. Connect this repository to your Coolify application.
2. Select **Docker (Dockerfile)** build pack.
3. Attach your PostgreSQL database service.
4. Set Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `JWT_SECRET`: Random 32+ character key.
   - `NEXT_PUBLIC_APP_URL`: Your production domain (e.g. `https://records.wbore.org`).
   - `RUN_SEED`: Set to `true` on initial deployment to auto-create the Super Admin user.
5. Deploy. The container startup script automatically runs database migrations (`prisma db push` / `prisma migrate deploy`) prior to launching the Next.js standalone server.
