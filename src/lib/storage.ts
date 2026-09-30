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

    // Resolve inside primary baseDir
    const candidatePath = path.resolve(this.baseDir, cleanKey);

    // Verify it stays inside baseDir
    if (!candidatePath.startsWith(path.resolve(this.baseDir))) {
      // Check legacy public directory as fallback
      const legacyPath = path.resolve(this.legacyPublicDir, cleanKey);
      if (!legacyPath.startsWith(path.resolve(this.legacyPublicDir))) {
        throw new Error("Security Error: Invalid path or directory traversal detected.");
      }
      return legacyPath;
    }

    return candidatePath;
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalFilename: string,
    subfolder: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const safePath = this.resolveSafePath(storageKeyOrPath);

    try {
      return await fs.readFile(safePath);
    } catch {
      // If not in baseDir, try legacy public directory
      const cleanKey = storageKeyOrPath
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/^uploads\//, "");
      const legacyPath = path.resolve(this.legacyPublicDir, cleanKey);
      return await fs.readFile(legacyPath);
    }
  }

  async exists(storageKeyOrPath: string): Promise<boolean> {
    try {
      const safePath = this.resolveSafePath(storageKeyOrPath);
      await fs.access(safePath);
      return true;
    } catch {
      try {
        const cleanKey = storageKeyOrPath
          .replace(/\\/g, "/")
          .replace(/^\/+/, "")
          .replace(/^uploads\//, "");
        const legacyPath = path.resolve(this.legacyPublicDir, cleanKey);
        await fs.access(legacyPath);
        return true;
      } catch {
        return false;
      }
    }
  }

  async getMetadata(storageKeyOrPath: string): Promise<StorageFileMetadata> {
    const safePath = this.resolveSafePath(storageKeyOrPath);
    try {
      const stats = await fs.stat(safePath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch {
      const cleanKey = storageKeyOrPath
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/^uploads\//, "");
      const legacyPath = path.resolve(this.legacyPublicDir, cleanKey);
      const stats = await fs.stat(legacyPath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
      };
    }
  }

  async deleteFile(storageKeyOrPath: string): Promise<void> {
    try {
      const safePath = this.resolveSafePath(storageKeyOrPath);
      await fs.unlink(safePath);
    } catch {
      try {
        const cleanKey = storageKeyOrPath
          .replace(/\\/g, "/")
          .replace(/^\/+/, "")
          .replace(/^uploads\//, "");
        const legacyPath = path.resolve(this.legacyPublicDir, cleanKey);
        await fs.unlink(legacyPath);
      } catch {
        // Ignored if file does not exist
      }
    }
  }
}

// Future S3/R2 Cloud Storage Adapter placeholder
class S3CompatibleStorageAdapter implements StorageAdapter {
  async uploadFile(): Promise<StorageUploadResult> {
    throw new Error(
      "S3/R2 storage adapter is configured for future cloud migration. Set STORAGE_DRIVER=LOCAL for current environment."
    );
  }
  async getFile(): Promise<Buffer> {
    throw new Error("S3/R2 storage adapter not initialized.");
  }
  async deleteFile(): Promise<void> {
    throw new Error("S3/R2 storage adapter not initialized.");
  }
  async exists(): Promise<boolean> {
    return false;
  }
  async getMetadata(): Promise<StorageFileMetadata> {
    throw new Error("S3/R2 storage adapter not initialized.");
  }
}

export function getStorage(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER || "LOCAL";
  if (driver === "S3" || driver === "R2" || driver === "WASABI") {
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
