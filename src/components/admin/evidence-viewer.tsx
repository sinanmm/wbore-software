"use client";

import React, { useState } from "react";
import { FileText, Image as ImageIcon, Video, Download, Eye, ExternalLink } from "lucide-react";
import { formatFileSize, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export interface EvidenceFileProps {
  id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string | Date;
}

export function EvidenceViewer({ files }: { files: EvidenceFileProps[] }) {
  const [selectedFile, setSelectedFile] = useState<EvidenceFileProps | null>(null);

  if (!files || files.length === 0) {
    return (
      <div className="p-8 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-2">
        <FileText className="h-8 w-8 mx-auto text-slate-600" />
        <p className="text-xs text-slate-400">No evidence documents submitted with this record.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Evidence Files ({files.length})
        </h4>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {files.map((file) => {
          const isImage = file.fileType.startsWith("image/");
          const isVideo = file.fileType.startsWith("video/");
          const isPdf = file.fileType.includes("pdf");

          return (
            <div
              key={file.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.fileUrl}
                      alt={file.originalName}
                      className="h-full w-full object-cover"
                    />
                  ) : isVideo ? (
                    <Video className="h-5 w-5 text-indigo-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-rose-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                    {file.originalName}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>•</span>
                    <span>{formatDateTime(file.createdAt)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(file)}
                  className="h-8 px-2 text-xs"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Preview
                </Button>
                <a href={file.fileUrl} download={file.originalName} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Preview */}
      <Modal
        isOpen={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        title={selectedFile?.originalName || "Evidence Document"}
        maxWidth="4xl"
      >
        {selectedFile && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[350px] max-h-[70vh]">
              {selectedFile.fileType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedFile.fileUrl}
                  alt={selectedFile.originalName}
                  className="max-h-[68vh] w-auto object-contain rounded-lg"
                />
              ) : selectedFile.fileType.startsWith("video/") ? (
                <video
                  controls
                  src={selectedFile.fileUrl}
                  className="max-h-[68vh] w-full rounded-lg"
                />
              ) : (
                <div className="p-8 text-center space-y-4">
                  <FileText className="h-16 w-16 mx-auto text-rose-400" />
                  <p className="text-sm text-slate-300">
                    PDF Document ({formatFileSize(selectedFile.fileSize)})
                  </p>
                  <a
                    href={selectedFile.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block"
                  >
                    <Button variant="gold" size="sm">
                      Open in New Tab
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>File size: {formatFileSize(selectedFile.fileSize)}</span>
              <a
                href={selectedFile.fileUrl}
                download={selectedFile.originalName}
                className="text-amber-400 hover:underline flex items-center gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                Download Original File
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
