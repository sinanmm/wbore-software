import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface StorageAdapter {
  uploadFile(
    fileBuffer: Buffer,
    filename: string,
    subfolder: string,
    mimeType: string
  ): Promise<{ fileUrl: string; storagePath: string }>;
  getFile(filePath: string): Promise<Buffer>;
  deleteFile(filePath: string): Promise<void>;
}

// Local Storage Driver
class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;
  private publicBaseUrl: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), "public", "uploads");
    this.publicBaseUrl = "/uploads";
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    subfolder: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mimeType: string
  ): Promise<{ fileUrl: string; storagePath: string }> {
    const targetDir = path.join(this.baseDir, subfolder);
    await fs.mkdir(targetDir, { recursive: true });

    const ext = path.extname(originalFilename).toLowerCase();
    const sanitizedBase = path
      .basename(originalFilename, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);
    const uniqueHash = crypto.randomBytes(6).toString("hex");
    const uniqueFilename = `${Date.now()}-${sanitizedBase}-${uniqueHash}${ext}`;

    const filePath = path.join(targetDir, uniqueFilename);
    await fs.writeFile(filePath, fileBuffer);

    const fileUrl = `${this.publicBaseUrl}/${subfolder}/${uniqueFilename}`;
    return {
      fileUrl,
      storagePath: filePath,
    };
  }

  async getFile(relativeOrFullPath: string): Promise<Buffer> {
    const cleanPath = relativeOrFullPath.startsWith("/uploads/")
      ? path.join(process.cwd(), "public", relativeOrFullPath)
      : relativeOrFullPath;
    return await fs.readFile(cleanPath);
  }

  async deleteFile(relativeOrFullPath: string): Promise<void> {
    try {
      const cleanPath = relativeOrFullPath.startsWith("/uploads/")
        ? path.join(process.cwd(), "public", relativeOrFullPath)
        : relativeOrFullPath;
      await fs.unlink(cleanPath);
    } catch {
      // Ignored if file doesn't exist
    }
  }
}

// Future Cloud Storage Driver (S3 / R2 / Wasabi compatible placeholder)
class S3CompatibleStorageAdapter implements StorageAdapter {
  // Configured via AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, S3_ENDPOINT
  async uploadFile(): Promise<{ fileUrl: string; storagePath: string }> {
    throw new Error("S3 Cloud storage configured for future migration. Set STORAGE_DRIVER=LOCAL for current storage.");
  }
  async getFile(): Promise<Buffer> {
    throw new Error("S3 Cloud storage not yet initialized.");
  }
  async deleteFile(): Promise<void> {
    throw new Error("S3 Cloud storage not yet initialized.");
  }
}

export function getStorage(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER || "LOCAL";
  if (driver === "S3" || driver === "R2") {
    return new S3CompatibleStorageAdapter();
  }
  return new LocalStorageAdapter();
}

export const storage = getStorage();

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
