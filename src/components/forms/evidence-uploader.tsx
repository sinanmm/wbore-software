"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, File, Image as ImageIcon, Video, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

export interface EvidenceFileItem {
  file: File;
  id: string;
  previewUrl?: string;
  status: "ready" | "uploading" | "error";
  error?: string;
}

export function EvidenceUploader({
  files,
  onChange,
  maxFiles = 10,
}: {
  files: EvidenceFileItem[];
  onChange: (files: EvidenceFileItem[]) => void;
  maxFiles?: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ];

    const currentCount = files.length;
    const addedItems: EvidenceFileItem[] = [];

    Array.from(newFiles).forEach((file, index) => {
      if (currentCount + addedItems.length >= maxFiles) return;

      const isAllowed =
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type === "application/pdf" ||
        allowedTypes.includes(file.type);

      if (!isAllowed) {
        alert(`File format "${file.type || file.name}" is not supported. Please upload Images, PDFs, or Videos.`);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 50MB maximum size.`);
        return;
      }

      const item: EvidenceFileItem = {
        file,
        id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        status: "ready",
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      };

      addedItems.push(item);
    });

    onChange([...files, ...addedItems]);
  };

  const removeFile = (id: string) => {
    const updated = files.filter((f) => f.id !== id);
    onChange(updated);
  };

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
          isDragging
            ? "border-amber-400 bg-amber-500/10 scale-[1.01]"
            : "border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-900/80"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-gold">
          <UploadCloud className="h-7 w-7" />
        </div>

        <h4 className="text-sm font-semibold text-white tracking-wide text-center">
          Upload Evidence & Verification Documents
        </h4>
        <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
          Drag and drop images, official PDF documents, or high-definition record videos.
        </p>
        <span className="text-[11px] text-amber-400/80 mt-2 font-medium">
          Supported: PNG, JPG, PDF, MP4, MOV (Up to 50MB per file, max {maxFiles} files)
        </span>
      </div>

      {/* Uploaded Items List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Attached Documents ({files.length} / {maxFiles})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {files.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/90 shadow-sm"
              >
                {/* Thumbnail or File Type Icon */}
                <div className="h-11 w-11 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : item.file.type.startsWith("video/") ? (
                    <Video className="h-5 w-5 text-indigo-400" />
                  ) : item.file.type.includes("pdf") ? (
                    <File className="h-5 w-5 text-rose-400" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-amber-400" />
                  )}
                </div>

                {/* File Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {item.file.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {formatFileSize(item.file.size)}
                  </p>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(item.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
