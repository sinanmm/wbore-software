"use client";

import React, { useState, useRef } from "react";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Download,
  Eye,
  ExternalLink,
  Plus,
  Trash2,
  Archive,
  UploadCloud,
  FileCheck2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { formatFileSize, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_FILE_COUNT,
  MAX_TOTAL_EVIDENCE_SIZE_BYTES,
  MAX_TOTAL_SIZE_MB,
} from "@/config/evidence-limits";

export interface EvidenceFileProps {
  id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string | Date;
}

export function getEvidenceFileTypeCategory(fileType: string, filename: string) {
  const lowerType = (fileType || "").toLowerCase().trim();
  const lowerName = (filename || "").toLowerCase().trim();

  const isImage =
    lowerType.startsWith("image/") ||
    lowerType === ".jpg" ||
    lowerType === ".jpeg" ||
    lowerType === ".png" ||
    lowerType === ".webp" ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".webp");

  const isVideo =
    lowerType.startsWith("video/") ||
    lowerType === ".mp4" ||
    lowerType === ".mov" ||
    lowerType === ".webm" ||
    lowerName.endsWith(".mp4") ||
    lowerName.endsWith(".mov") ||
    lowerName.endsWith(".webm");

  const isPdf =
    lowerType === "application/pdf" ||
    lowerType === ".pdf" ||
    lowerType.includes("pdf") ||
    lowerName.endsWith(".pdf");

  const isDoc =
    lowerType.includes("word") ||
    lowerType.includes("document") ||
    lowerType.includes("spreadsheet") ||
    lowerType === ".doc" ||
    lowerType === ".docx" ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx");

  return { isImage, isVideo, isPdf, isDoc };
}

export function EvidenceViewer({
  files,
  applicationId,
  currentUserRole,
  onEvidenceChange,
}: {
  files: EvidenceFileProps[];
  applicationId?: string;
  currentUserRole?: string;
  onEvidenceChange?: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<EvidenceFileProps | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Add Evidence Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [evidenceCategory, setEvidenceCategory] = useState("Independent Witness Affidavit");
  const [uploadNotes, setUploadNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Remove Evidence Modal State
  const [fileToRemove, setFileToRemove] = useState<EvidenceFileProps | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Dossier Download State
  const [isDownloadingDossier, setIsDownloadingDossier] = useState(false);

  // Permissions: VERIFICATION_OFFICER cannot upload or remove
  const canModify = currentUserRole === "SUPER_ADMIN" || currentUserRole === "ADMIN";

  const totalSize = (files || []).reduce((acc, f) => acc + f.fileSize, 0);

  // Handle Admin Additional Evidence Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadFile || !applicationId) return;

    setIsUploading(true);
    setUploadError(null);

    if (selectedUploadFile.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File "${selectedUploadFile.name}" exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`);
      setIsUploading(false);
      return;
    }

    if (totalSize + selectedUploadFile.size > MAX_TOTAL_EVIDENCE_SIZE_BYTES) {
      setUploadError(`Total evidence files size exceeds the ${MAX_TOTAL_SIZE_MB}MB limit for this application.`);
      setIsUploading(false);
      return;
    }

    if (files && files.length >= MAX_FILE_COUNT) {
      setUploadError(`Maximum evidence file limit reached (${MAX_FILE_COUNT} files).`);
      setIsUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", selectedUploadFile);
      formData.append("category", evidenceCategory);
      formData.append("notes", uploadNotes);

      const res = await fetch(`/api/applications/${applicationId}/evidence`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload evidence file.");
      }

      setIsAddModalOpen(false);
      setSelectedUploadFile(null);
      setUploadNotes("");
      if (onEvidenceChange) {
        onEvidenceChange();
      }
    } catch (err: any) {
      setUploadError(err.message || "An error occurred during file upload.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Evidence Removal
  const handleRemoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToRemove || !applicationId) return;

    if (!removeReason.trim() || removeReason.trim().length < 3) {
      setRemoveError("A removal justification reason (minimum 3 characters) is required.");
      return;
    }

    setIsRemoving(true);
    setRemoveError(null);

    try {
      const res = await fetch(`/api/applications/${applicationId}/evidence/${fileToRemove.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: removeReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove evidence file.");
      }

      setFileToRemove(null);
      setRemoveReason("");
      if (onEvidenceChange) {
        onEvidenceChange();
      }
    } catch (err: any) {
      setRemoveError(err.message || "An error occurred while removing evidence.");
    } finally {
      setIsRemoving(false);
    }
  };

  // Handle Dossier Download
  const handleDownloadDossier = () => {
    if (!applicationId || files.length === 0) return;
    setIsDownloadingDossier(true);
    try {
      const downloadUrl = `/api/applications/${applicationId}/evidence/dossier`;
      window.location.href = downloadUrl;
    } finally {
      setTimeout(() => setIsDownloadingDossier(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Evidence Summary Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Evidence Dossier Files ({files ? files.length : 0})
            </h4>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              {formatFileSize(totalSize)} Total
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Verified candidate attachments, affidavits, calibration logs, and video records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Dossier Download Button */}
          {files && files.length > 0 && applicationId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadDossier}
              isLoading={isDownloadingDossier}
              className="h-8 text-xs font-semibold text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Download Dossier (.ZIP)
            </Button>
          )}

          {/* Add Evidence Button (Staff only) */}
          {canModify && applicationId && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                setUploadError(null);
                setIsAddModalOpen(true);
              }}
              className="h-8 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Evidence
            </Button>
          )}
        </div>
      </div>

      {/* Evidence List */}
      {!files || files.length === 0 ? (
        <div className="p-10 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-2">
          <FileText className="h-9 w-9 mx-auto text-slate-600" />
          <p className="text-xs text-slate-300 font-medium">
            No evidence documents submitted with this application.
          </p>
          <p className="text-[11px] text-slate-500">
            Authorized adjudicators can attach additional verified documents above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {files.map((file) => {
            const { isImage, isVideo, isDoc } = getEvidenceFileTypeCategory(
              file.fileType,
              file.originalName || file.fileName
            );

            const canonicalUrl = applicationId
              ? `/api/applications/${applicationId}/evidence/${file.id}`
              : file.fileUrl;

            const previewEndpoint = canonicalUrl;
            const downloadEndpoint = `${canonicalUrl}?download=true`;
            const imageFailed = !!failedImages[file.id];

            return (
              <div
                key={file.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {isImage && !imageFailed ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewEndpoint}
                        alt={file.originalName}
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [file.id]: true }))
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : isImage ? (
                      <ImageIcon className="h-5 w-5 text-amber-400" />
                    ) : isVideo ? (
                      <Video className="h-5 w-5 text-indigo-400" />
                    ) : isDoc ? (
                      <FileSpreadsheet className="h-5 w-5 text-blue-400" />
                    ) : (
                      <FileText className="h-5 w-5 text-rose-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                      {file.originalName}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-amber-400/90">{formatFileSize(file.fileSize)}</span>
                      <span>•</span>
                      <span>{formatDateTime(file.createdAt)}</span>
                      <span>•</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <FileCheck2 className="h-3 w-3" />
                        Verified Active
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Preview Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(file)}
                    className="h-8 px-2.5 text-xs font-medium"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    Preview
                  </Button>

                  {/* Secure Download Button */}
                  <a href={downloadEndpoint} download={file.originalName}>
                    <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-slate-300 hover:text-white">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>

                  {/* Remove Button (Super Admin / Admin only) */}
                  {canModify && applicationId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRemoveError(null);
                        setRemoveReason("");
                        setFileToRemove(file);
                      }}
                      className="h-8 px-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. PREVIEW MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        title={selectedFile?.originalName || "Evidence Document"}
        maxWidth="4xl"
      >
        {selectedFile && (() => {
          const { isImage, isVideo, isPdf } = getEvidenceFileTypeCategory(
            selectedFile.fileType,
            selectedFile.originalName || selectedFile.fileName
          );

          const canonicalUrl = applicationId
            ? `/api/applications/${applicationId}/evidence/${selectedFile.id}`
            : selectedFile.fileUrl;

          const previewEndpoint = canonicalUrl;
          const downloadEndpoint = `${canonicalUrl}?download=true`;
          const imageFailed = !!failedImages[selectedFile.id];

          return (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[350px] max-h-[70vh]">
                {isImage && !imageFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewEndpoint}
                    alt={selectedFile.originalName}
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [selectedFile.id]: true }))
                    }
                    className="max-h-[68vh] w-auto object-contain rounded-lg"
                  />
                ) : isImage && imageFailed ? (
                  <div className="p-8 text-center space-y-4">
                    <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedFile.originalName}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Inline preview unavailable. Please download the file to inspect the original evidence.
                      </p>
                    </div>
                    <a href={downloadEndpoint} download={selectedFile.originalName}>
                      <Button variant="gold" size="sm">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download Original File
                      </Button>
                    </a>
                  </div>
                ) : isVideo ? (
                  <video
                    controls
                    src={previewEndpoint}
                    className="max-h-[68vh] w-full rounded-lg"
                  />
                ) : isPdf ? (
                  <div className="w-full h-[65vh] flex flex-col">
                    <iframe
                      src={`${previewEndpoint}#toolbar=1`}
                      className="w-full flex-1 rounded-lg border border-slate-800"
                      title={selectedFile.originalName}
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-4">
                    <FileText className="h-16 w-16 mx-auto text-blue-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedFile.originalName}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Document format: {selectedFile.fileType} ({formatFileSize(selectedFile.fileSize)})
                      </p>
                    </div>
                    <a href={downloadEndpoint} download={selectedFile.originalName}>
                      <Button variant="gold" size="sm">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download File to View
                      </Button>
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>File size: {formatFileSize(selectedFile.fileSize)}</span>
                <a
                  href={downloadEndpoint}
                  download={selectedFile.originalName}
                  className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Original File
                </a>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ============================================================ */}
      {/* 2. ADD EVIDENCE MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Supplementary Evidence"
        description="Attach official verification documents, expert affidavits, or calibration proof to this record application."
        maxWidth="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          {uploadError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Evidence Category Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Evidence Type / Category <span className="text-amber-400">*</span>
            </label>
            <select
              value={evidenceCategory}
              onChange={(e) => setEvidenceCategory(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
              required
            >
              <option value="Independent Witness Affidavit">Independent Witness Affidavit</option>
              <option value="Photographic Evidence">Photographic Proof</option>
              <option value="Video Recording Documentation">Video Recording Documentation</option>
              <option value="Calibration / Technical Log">Calibration / Technical Metric Log</option>
              <option value="Identification Document">Applicant Identity Verification</option>
              <option value="Official Institutional Certification">Institutional / Notary Certification</option>
              <option value="Supplementary Evidence Dossier">Supplementary Evidence Dossier</option>
            </select>
          </div>

          {/* File Picker / Dropzone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Document File <span className="text-amber-400">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.mp4,.mov"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  if (file.size > MAX_FILE_SIZE_BYTES) {
                    setUploadError(`File "${file.name}" exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`);
                    setSelectedUploadFile(null);
                    return;
                  }
                  if (totalSize + file.size > MAX_TOTAL_EVIDENCE_SIZE_BYTES) {
                    setUploadError(`Adding this file would exceed the total application limit of ${MAX_TOTAL_SIZE_MB}MB.`);
                    setSelectedUploadFile(null);
                    return;
                  }
                  setUploadError(null);
                  setSelectedUploadFile(file);
                }
              }}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-5 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-colors space-y-1.5"
            >
              <UploadCloud className="h-8 w-8 mx-auto text-amber-400/80" />
              {selectedUploadFile ? (
                <div>
                  <p className="text-xs font-semibold text-white">{selectedUploadFile.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatFileSize(selectedUploadFile.size)} • Click to change file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    Click to select file or drag and drop
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Allowed: JPG, PNG, WEBP, PDF, DOC, DOCX, MP4, MOV (Max {MAX_FILE_SIZE_MB}MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Adjudicator Notes / Source Reference (Optional)
            </label>
            <Textarea
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              placeholder="e.g. Received via notarized postal courier on 28-Sep-2026..."
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              isLoading={isUploading}
              disabled={!selectedUploadFile || isUploading}
              className="font-bold shadow-gold"
            >
              {isUploading ? "Uploading & Encrypting..." : "Upload Evidence"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* 3. REMOVE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={!!fileToRemove}
        onClose={() => setFileToRemove(null)}
        title="Remove Evidence File"
        maxWidth="md"
      >
        {fileToRemove && (
          <form onSubmit={handleRemoveSubmit} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
              <p className="font-semibold text-rose-200">Warning: Irreversible Administrative Action</p>
              <p className="text-[11px] leading-relaxed">
                This will permanently delete the evidence file{" "}
                <strong className="text-white">&quot;{fileToRemove.originalName}&quot;</strong> ({formatFileSize(fileToRemove.fileSize)})
                from physical storage and from this application record.
              </p>
            </div>

            {removeError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {removeError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Removal Justification Reason <span className="text-rose-400">*</span>
              </label>
              <Textarea
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder="State the formal adjudication reason for removing this file (e.g. Duplicate submission, unreadable corruption, invalid document)..."
                rows={3}
                required
                className="text-xs"
              />
              <p className="text-[10px] text-slate-500">
                This reason will be recorded in the immutable audit log with your staff credentials.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFileToRemove(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                isLoading={isRemoving}
                disabled={isRemoving || !removeReason.trim()}
                className="font-bold"
              >
                {isRemoving ? "Removing..." : "Confirm & Remove"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
