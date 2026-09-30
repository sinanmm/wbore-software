import zlib from "zlib";

/**
 * Standard CRC32 calculation table for ZIP archives
 */
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

function calculateCrc32(buf: Buffer): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export interface ZipEntry {
  filename: string;
  data: Buffer;
  date?: Date;
}

/**
 * Lightweight, zero-dependency ZIP archive generator built on Node's native zlib.
 * Generates standard PKZIP 2.0 archives compatible with all OS zip utilities.
 */
export class ZipArchive {
  private entries: ZipEntry[] = [];

  public addFile(filename: string, data: Buffer, date?: Date): void {
    // Sanitize filename to prevent path traversal in zip
    const cleanName = filename
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\.\.\//g, "");

    this.entries.push({
      filename: cleanName,
      data,
      date: date || new Date(),
    });
  }

  public toBuffer(): Buffer {
    const localHeaders: Buffer[] = [];
    const centralHeaders: Buffer[] = [];
    let offset = 0;

    for (const entry of this.entries) {
      const filenameBuf = Buffer.from(entry.filename, "utf8");
      const uncompressedSize = entry.data.length;
      const crc = calculateCrc32(entry.data);

      // Deflate compression
      const compressedData = zlib.deflateRawSync(entry.data);
      const compressedSize = compressedData.length;

      // Convert date to DOS format
      const d = entry.date || new Date();
      const dosTime =
        ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
      const dosDate =
        (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;

      // 1. Local File Header (30 bytes + filename + data)
      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
      localHeader.writeUInt16LE(20, 4); // Version needed to extract (2.0)
      localHeader.writeUInt16LE(0x0800, 6); // General purpose bit flag (UTF-8)
      localHeader.writeUInt16LE(8, 8); // Compression method (8 = Deflate)
      localHeader.writeUInt16LE(dosTime, 10);
      localHeader.writeUInt16LE(dosDate, 12);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(compressedSize, 18);
      localHeader.writeUInt32LE(uncompressedSize, 22);
      localHeader.writeUInt16LE(filenameBuf.length, 26);
      localHeader.writeUInt16LE(0, 28); // Extra field length

      const localChunk = Buffer.concat([localHeader, filenameBuf, compressedData]);
      localHeaders.push(localChunk);

      // 2. Central Directory Header (46 bytes + filename)
      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory header signature
      centralHeader.writeUInt16LE(20, 4); // Version made by
      centralHeader.writeUInt16LE(20, 6); // Version needed to extract
      centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
      centralHeader.writeUInt16LE(8, 10); // Deflate
      centralHeader.writeUInt16LE(dosTime, 12);
      centralHeader.writeUInt16LE(dosDate, 14);
      centralHeader.writeUInt32LE(crc, 16);
      centralHeader.writeUInt32LE(compressedSize, 20);
      centralHeader.writeUInt32LE(uncompressedSize, 24);
      centralHeader.writeUInt16LE(filenameBuf.length, 28);
      centralHeader.writeUInt16LE(0, 30); // Extra field length
      centralHeader.writeUInt16LE(0, 32); // File comment length
      centralHeader.writeUInt16LE(0, 34); // Disk number start
      centralHeader.writeUInt16LE(0, 36); // Internal file attributes
      centralHeader.writeUInt32LE(0, 38); // External file attributes
      centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header

      const centralChunk = Buffer.concat([centralHeader, filenameBuf]);
      centralHeaders.push(centralChunk);

      offset += localChunk.length;
    }

    const centralDirOffset = offset;
    const centralDirBuffer = Buffer.concat(centralHeaders);
    const centralDirSize = centralDirBuffer.length;

    // 3. End of Central Directory Record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
    eocd.writeUInt16LE(0, 4); // Disk number
    eocd.writeUInt16LE(0, 6); // Disk number with start of central directory
    eocd.writeUInt16LE(this.entries.length, 8); // Number of entries on this disk
    eocd.writeUInt16LE(this.entries.length, 10); // Total number of entries
    eocd.writeUInt32LE(centralDirSize, 12); // Size of central directory
    eocd.writeUInt32LE(centralDirOffset, 16); // Offset of start of central directory
    eocd.writeUInt16LE(0, 20); // Comment length

    return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
  }
}
