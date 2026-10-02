import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface StorageFileMetadata {
  size: number;
  lastModified?: Date;
}

export interface StorageUploadResult {
  storageKey: string;
  fileUrl: string;
  storagePath: string;
}

export interface StorageUploadOptions {
  preserveFilename?: boolean;
}

export interface StorageAdapter {
  uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    subfolder: string,
    mimeType: string,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult>;
  getFile(storageKeyOrPath: string): Promise<Buffer>;
  downloadFile(storageKeyOrPath: string): Promise<Buffer>;
  deleteFile(storageKeyOrPath: string): Promise<void>;
  exists(storageKeyOrPath: string): Promise<boolean>;
  getMetadata(storageKeyOrPath: string): Promise<StorageFileMetadata>;
}

/**
 * Local Storage Adapter implementation.
 * Stores evidence files securely on the local filesystem / mounted volume.
 * Resolves paths safely with directory-traversal prevention.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;
  private legacyPublicDir: string;

  constructor() {
    // If STORAGE_LOCAL_DIR is provided (e.g. Docker volume /app/storage/uploads or /app/public/uploads), use it.
    // Otherwise fallback to process.cwd()/public/uploads for seamless local development.
    const customDir = process.env.STORAGE_LOCAL_DIR;
    this.baseDir = customDir
      ? path.resolve(customDir)
      : path.join(process.cwd(), "public", "uploads");

    this.legacyPublicDir = path.join(process.cwd(), "public", "uploads");
  }

  /**
   * Resolves a storage key or legacy path into a verified safe physical filesystem path.
   * Strictly prevents directory traversal attacks (e.g. ../../etc/passwd).
   */
  private resolveSafePath(storageKeyOrPath: string): string {
    // Strip leading slashes and legacy prefixes
    let cleanKey = storageKeyOrPath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (cleanKey.startsWith("uploads/")) {
      cleanKey = cleanKey.slice("uploads/".length);
    }

    const baseResolved = path.resolve(this.baseDir);
    const legacyResolved = path.resolve(this.legacyPublicDir);

    // List candidate paths to check in order of priority
    const candidates = [
      path.resolve(this.baseDir, cleanKey),
      path.resolve(this.legacyPublicDir, cleanKey),
      path.resolve(this.baseDir, "evidence", cleanKey),
      path.resolve(this.legacyPublicDir, "evidence", cleanKey),
      path.resolve(this.baseDir, "evidence", path.basename(cleanKey)),
      path.resolve(this.legacyPublicDir, "evidence", path.basename(cleanKey)),
    ];

    for (const candidate of candidates) {
      if (
        candidate.startsWith(baseResolved) ||
        candidate.startsWith(legacyResolved)
      ) {
        return candidate;
      }
    }

    // Default back to baseDir candidate with strict traversal check
    const defaultCandidate = path.resolve(this.baseDir, cleanKey);
    if (!defaultCandidate.startsWith(baseResolved) && !defaultCandidate.startsWith(legacyResolved)) {
      throw new Error("Security Error: Invalid path or directory traversal detected.");
    }

    return defaultCandidate;
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    subfolder: string,
    _mimeType: string,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    const cleanSubfolder = subfolder
      .replace(/\\/g, "/")
      .split("/")
      .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ""))
      .filter(Boolean)
      .join("/");

    const targetDir = path.join(this.baseDir, cleanSubfolder);
    await fs.mkdir(targetDir, { recursive: true });

    const ext = path.extname(originalFilename).toLowerCase();
    const sanitizedBase = path
      .basename(originalFilename, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80);

    let finalFilename: string;
    if (options?.preserveFilename) {
      finalFilename = `${sanitizedBase}${ext}`;
    } else {
      const uniqueHash = crypto.randomBytes(8).toString("hex");
      finalFilename = `${Date.now()}-${sanitizedBase}-${uniqueHash}${ext}`;
    }

    const filePath = path.join(targetDir, finalFilename);
    await fs.writeFile(filePath, fileBuffer);

    const storageKey = cleanSubfolder ? `${cleanSubfolder}/${finalFilename}` : finalFilename;
    // Virtual file URL used in database
    const fileUrl = `/uploads/${storageKey}`;

    return {
      storageKey,
      fileUrl,
      storagePath: filePath,
    };
  }

  async getFile(storageKeyOrPath: string): Promise<Buffer> {
    // Strip leading slashes and legacy prefixes
    let cleanKey = storageKeyOrPath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (cleanKey.startsWith("uploads/")) {
      cleanKey = cleanKey.slice("uploads/".length);
    }

    const baseResolved = path.resolve(this.baseDir);
    const legacyResolved = path.resolve(this.legacyPublicDir);

    const candidates = [
      path.resolve(this.baseDir, cleanKey),
      path.resolve(this.legacyPublicDir, cleanKey),
      path.resolve(this.baseDir, "evidence", cleanKey),
      path.resolve(this.legacyPublicDir, "evidence", cleanKey),
      path.resolve(this.baseDir, "evidence", path.basename(cleanKey)),
      path.resolve(this.legacyPublicDir, "evidence", path.basename(cleanKey)),
    ];

    for (const candidate of candidates) {
      if (candidate.startsWith(baseResolved) || candidate.startsWith(legacyResolved)) {
        try {
          return await fs.readFile(candidate);
        } catch {
          // Continue to next candidate
        }
      }
    }

    throw new Error(`File not found in storage: ${storageKeyOrPath}`);
  }

  async downloadFile(storageKeyOrPath: string): Promise<Buffer> {
    return this.getFile(storageKeyOrPath);
  }

  async exists(storageKeyOrPath: string): Promise<boolean> {
    try {
      await this.getFile(storageKeyOrPath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(storageKeyOrPath: string): Promise<StorageFileMetadata> {
    let cleanKey = storageKeyOrPath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (cleanKey.startsWith("uploads/")) {
      cleanKey = cleanKey.slice("uploads/".length);
    }

    const baseResolved = path.resolve(this.baseDir);
    const legacyResolved = path.resolve(this.legacyPublicDir);

    const candidates = [
      path.resolve(this.baseDir, cleanKey),
      path.resolve(this.legacyPublicDir, cleanKey),
      path.resolve(this.baseDir, "evidence", cleanKey),
      path.resolve(this.legacyPublicDir, "evidence", cleanKey),
      path.resolve(this.baseDir, "evidence", path.basename(cleanKey)),
      path.resolve(this.legacyPublicDir, "evidence", path.basename(cleanKey)),
    ];

    for (const candidate of candidates) {
      if (candidate.startsWith(baseResolved) || candidate.startsWith(legacyResolved)) {
        try {
          const stats = await fs.stat(candidate);
          return {
            size: stats.size,
            lastModified: stats.mtime,
          };
        } catch {
          // Continue to next candidate
        }
      }
    }

    throw new Error(`File not found for metadata: ${storageKeyOrPath}`);
  }

  async deleteFile(storageKeyOrPath: string): Promise<void> {
    let cleanKey = storageKeyOrPath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (cleanKey.startsWith("uploads/")) {
      cleanKey = cleanKey.slice("uploads/".length);
    }

    const baseResolved = path.resolve(this.baseDir);
    const legacyResolved = path.resolve(this.legacyPublicDir);

    const candidates = [
      path.resolve(this.baseDir, cleanKey),
      path.resolve(this.legacyPublicDir, cleanKey),
      path.resolve(this.baseDir, "evidence", cleanKey),
      path.resolve(this.legacyPublicDir, "evidence", cleanKey),
    ];

    for (const candidate of candidates) {
      if (candidate.startsWith(baseResolved) || candidate.startsWith(legacyResolved)) {
        try {
          await fs.unlink(candidate);
          return;
        } catch {
          // Continue
        }
      }
    }
  }
}

/**
 * Production S3-Compatible Cloud Storage Adapter.
 * Supports AWS S3, Cloudflare R2, MinIO, and Wasabi.
 * Uses persistent S3-compatible storage without altering application domain models.
 */
export class S3CompatibleStorageAdapter implements StorageAdapter {
  private clientPromise: Promise<any> | null = null;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "wbre-evidence";
  }

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { S3Client } = await import("@aws-sdk/client-s3");
        const endpoint = process.env.S3_ENDPOINT;
        const region = process.env.S3_REGION || "us-east-1";
        const accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
        const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";

        return new S3Client({
          region,
          endpoint: endpoint || undefined,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          forcePathStyle: !!endpoint,
        });
      })();
    }
    return this.clientPromise;
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    subfolder: string,
    mimeType: string,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();

    const cleanSubfolder = subfolder
      .replace(/\\/g, "/")
      .split("/")
      .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ""))
      .filter(Boolean)
      .join("/");

    const ext = path.extname(originalFilename).toLowerCase();
    const sanitizedBase = path
      .basename(originalFilename, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80);

    let finalFilename: string;
    if (options?.preserveFilename) {
      finalFilename = `${sanitizedBase}${ext}`;
    } else {
      const uniqueHash = crypto.randomBytes(8).toString("hex");
      finalFilename = `${Date.now()}-${sanitizedBase}-${uniqueHash}${ext}`;
    }

    const storageKey = cleanSubfolder ? `${cleanSubfolder}/${finalFilename}` : finalFilename;

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: fileBuffer,
        ContentType: mimeType || "application/octet-stream",
      })
    );

    const fileUrl = `/uploads/${storageKey}`;
    return {
      storageKey,
      fileUrl,
      storagePath: storageKey,
    };
  }

  async getFile(storageKeyOrPath: string): Promise<Buffer> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();

    let cleanKey = storageKeyOrPath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (cleanKey.startsWith("uploads/")) {
      cleanKey = cleanKey.slice("uploads/".length);
    }

    const response = await client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      })
    );

    if (!response.Body) {
      throw new Error(`File not found in S3 bucket: ${cleanKey}`);
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  async downloadFile(storageKeyOrPath: string): Promise<Buffer> {
    return this.getFile(storageKeyOrPath);
  }

  async deleteFile(storageKeyOrPath: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();

    let cleanKey = storageKeyOrPath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (cleanKey.startsWith("uploads/")) {
      cleanKey = cleanKey.slice("uploads/".length);
    }

    await client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      })
    );
  }

  async exists(storageKeyOrPath: string): Promise<boolean> {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();

    let cleanKey = storageKeyOrPath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (cleanKey.startsWith("uploads/")) {
      cleanKey = cleanKey.slice("uploads/".length);
    }

    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(storageKeyOrPath: string): Promise<StorageFileMetadata> {
    const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.getClient();

    let cleanKey = storageKeyOrPath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (cleanKey.startsWith("uploads/")) {
      cleanKey = cleanKey.slice("uploads/".length);
    }

    const res = await client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      })
    );

    return {
      size: res.ContentLength ?? 0,
      lastModified: res.LastModified,
    };
  }
}

export function getStorage(): StorageAdapter {
  const provider = (
    process.env.STORAGE_PROVIDER ||
    process.env.STORAGE_DRIVER ||
    "LOCAL"
  ).toUpperCase();

  if (
    provider === "S3" ||
    provider === "R2" ||
    provider === "WASABI" ||
    provider === "MINIO"
  ) {
    return new S3CompatibleStorageAdapter();
  }
  return new LocalStorageAdapter();
}

export const storage = getStorage();

export {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_COUNT,
  MAX_TOTAL_EVIDENCE_SIZE_BYTES,
  MAX_DOSSIER_SIZE_BYTES,
  ALLOWED_EVIDENCE_TYPES,
} from "./file-security";
