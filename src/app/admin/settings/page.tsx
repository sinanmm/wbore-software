import React from "react";
import { certificateTemplate } from "@/config/certificate-template";
import { Settings, Sliders, Database, HardDrive, Cpu, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  const isSuperAdmin = session.role === Role.SUPER_ADMIN;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-white tracking-tight font-serif">
            System & Engine Settings
          </h2>
          {!isSuperAdmin && (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs border border-slate-700">
              Read Only (Requires SUPER_ADMIN for changes)
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">
          Certificate template coordinates engine, storage driver, and system parameters.
        </p>
      </div>

      {/* Certificate Generator Engine Config */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Sliders className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Certificate Coordinate Engine Configuration (certificate-template.ts)
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          The certificate generator overlays vector typography onto the official 1055 x 1491 A4
          template image using the following exact coordinates:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <p className="font-bold text-amber-400">Template Specifications</p>
            <p className="text-slate-300">ID: {certificateTemplate.id}</p>
            <p className="text-slate-300">Name: {certificateTemplate.name}</p>
            <p className="text-slate-300">
              Dimensions: {certificateTemplate.width} x {certificateTemplate.height} px
            </p>
            <p className="text-slate-300">Aspect Ratio: A4 Portrait (1:√2)</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <p className="font-bold text-amber-400">Recipient Name Coordinates</p>
            <p className="text-slate-300">X: {certificateTemplate.recipientName.x} (Centered)</p>
            <p className="text-slate-300">Y: {certificateTemplate.recipientName.y} px</p>
            <p className="text-slate-300">
              Base Font Size: {certificateTemplate.recipientName.fontSize} px
            </p>
            <p className="text-slate-300">Font: {certificateTemplate.recipientName.fontFamily}</p>
          </div>
        </div>

        {/* Dynamic Fields Matrix */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 overflow-x-auto">
          <p className="text-xs font-bold text-slate-300 mb-2">Record Field Coordinates</p>
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="text-slate-500 border-b border-slate-800 pb-2">
              <tr>
                <th className="py-2">Field</th>
                <th className="py-2">X Position</th>
                <th className="py-2">Y Position</th>
                <th className="py-2">Font Size</th>
                <th className="py-2">Prefix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              <tr>
                <td className="py-2 font-semibold text-amber-300">Category</td>
                <td>{certificateTemplate.category.x} px</td>
                <td>{certificateTemplate.category.y} px</td>
                <td>{certificateTemplate.category.fontSize} px</td>
                <td>{certificateTemplate.category.prefix || "None"}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-amber-300">Achievement Title</td>
                <td>{certificateTemplate.achievementTitle.x} px</td>
                <td>{certificateTemplate.achievementTitle.y} px</td>
                <td>{certificateTemplate.achievementTitle.fontSize} px</td>
                <td>{certificateTemplate.achievementTitle.prefix || "None"}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-amber-300">Place</td>
                <td>{certificateTemplate.place.x} px</td>
                <td>{certificateTemplate.place.y} px</td>
                <td>{certificateTemplate.place.fontSize} px</td>
                <td>{certificateTemplate.place.prefix || "None"}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-amber-300">Record ID</td>
                <td>{certificateTemplate.recordId.x} px</td>
                <td>{certificateTemplate.recordId.y} px</td>
                <td>{certificateTemplate.recordId.fontSize} px</td>
                <td>{certificateTemplate.recordId.prefix || "None"}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-amber-300">Certificate Number</td>
                <td>{certificateTemplate.certificateNumber.x} px</td>
                <td>{certificateTemplate.certificateNumber.y} px</td>
                <td>{certificateTemplate.certificateNumber.fontSize} px</td>
                <td>{certificateTemplate.certificateNumber.prefix || "None"}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-amber-300">Date of Recognition</td>
                <td>{certificateTemplate.dateOfRecognition.x} px</td>
                <td>{certificateTemplate.dateOfRecognition.y} px</td>
                <td>{certificateTemplate.dateOfRecognition.fontSize} px</td>
                <td>{certificateTemplate.dateOfRecognition.prefix || "None"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Storage & Database Architecture Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl p-6 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <HardDrive className="h-5 w-5 text-blue-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Storage Adapter Status
            </h4>
          </div>
          <p className="text-xs text-slate-300">
            Current Driver: <span className="font-mono text-amber-400 font-bold">LOCAL</span>
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Local storage adapter is active at <span className="font-mono text-slate-300">./public/uploads</span>.
            Future cloud migration interfaces for AWS S3, Wasabi, or Cloudflare R2 are modularly prepared in <span className="font-mono text-slate-300">src/lib/storage.ts</span>.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl p-6 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Database className="h-5 w-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Database Provider
            </h4>
          </div>
          <p className="text-xs text-slate-300">
            Engine: <span className="font-mono text-emerald-400 font-bold">PostgreSQL via Prisma ORM</span>
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Clean schema with User, Application, EvidenceFile, Certificate, and AuditLog models. Configured for Coolify deployment with automated migrations.
          </p>
        </div>
      </div>
    </div>
  );
}
