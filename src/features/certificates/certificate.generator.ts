import fs from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts, PDFFont } from "pdf-lib";
import { certificateTemplate } from "@/config/certificate-template";
import { storage } from "@/lib/storage";

export interface GenerateCertificateData {
  recipientName: string;
  category: string;
  achievementTitle: string;
  place: string;
  recordId: string;
  certificateNumber: string;
  dateOfRecognition: string;
  verificationUrl?: string;
}

export interface GeneratedCertificateResult {
  pdfBuffer: Buffer;
  pdfUrl: string;
  storageKey: string;
  qrCodeDataUrl: string;
  verificationUrl: string;
}

/**
 * Normalizes text to ensure safe rendering in standard WinAnsi PDF fonts
 * while preserving international and accented Latin characters where possible.
 */
function sanitizeText(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .trim();
}

/**
 * Splits text into lines that fit within a maximum width in points.
 */
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export class CertificateGenerator {
  /**
   * Generates a high-resolution A4 Certificate PDF by overlaying dynamic text
   * onto the official WBRE base template image.
   */
  public static async generate(
    data: GenerateCertificateData
  ): Promise<GeneratedCertificateResult> {
    // 1. Validate that the base template exists and is readable
    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "certificate-template.png"
    );

    try {
      await fs.access(templatePath);
    } catch {
      throw new Error(
        "Certificate template file is missing or unreadable at public/templates/certificate-template.png"
      );
    }

    const templateBytes = await fs.readFile(templatePath);
    if (!templateBytes || templateBytes.length < 1000) {
      throw new Error("Certificate template file is corrupted or empty.");
    }

    // 2. Initialize PDF Document and embed base template image
    const pdfDoc = await PDFDocument.create();
    let bgImage;
    try {
      bgImage = await pdfDoc.embedPng(templateBytes);
    } catch (embedErr: any) {
      throw new Error(`Failed to decode certificate template image: ${embedErr.message}`);
    }

    const { width, height } = bgImage;
    if (Math.abs(width - certificateTemplate.width) > 50 || Math.abs(height - certificateTemplate.height) > 50) {
      console.warn(
        `Template dimensions (${width}x${height}) differ slightly from configured (${certificateTemplate.width}x${certificateTemplate.height}). Preserving native image dimensions.`
      );
    }

    // 3. Add Page with exact template dimensions (1055 x 1491 px)
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(bgImage, { x: 0, y: 0, width, height });

    // 4. Embed typography fonts
    const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const fontSansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSansRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 5. Overlay Recipient Name (Centered with dynamic auto-scaling)
    // NOTE: Master template parchment background must be preserved without artificial white rectangles
    const rawName = sanitizeText(data.recipientName).toUpperCase();
    let nameFontSize = certificateTemplate.recipientName.fontSize || 38;
    const maxNameWidth = certificateTemplate.recipientName.maxWidth || 720;
    const minSafeNameFontSize = 16;

    let nameWidth = fontSerifBold.widthOfTextAtSize(rawName, nameFontSize);
    if (nameWidth > maxNameWidth) {
      nameFontSize = Math.floor(nameFontSize * (maxNameWidth / nameWidth));
    }

    if (nameFontSize < minSafeNameFontSize) {
      throw new Error(
        `Recipient name "${data.recipientName}" exceeds safe certificate boundary. Please use an abbreviated name.`
      );
    }

    const finalNameWidth = fontSerifBold.widthOfTextAtSize(rawName, nameFontSize);
    const nameX = (width - finalNameWidth) / 2;
    const nameY = height - certificateTemplate.recipientName.y;

    page.drawText(rawName, {
      x: nameX,
      y: nameY,
      size: nameFontSize,
      font: fontSerifBold,
      color: rgb(0.06, 0.12, 0.24), // deep royal navy
    });

    // 6. Overlay Category (Single Line)
    const categoryConfig = certificateTemplate.category;
    const categoryText = (categoryConfig.prefix || ":   ") + sanitizeText(data.category).toUpperCase();
    let catFontSize = categoryConfig.fontSize || 14;
    let catWidth = fontSansBold.widthOfTextAtSize(categoryText, catFontSize);
    const maxFieldWidth = categoryConfig.maxWidth || 440;

    if (catWidth > maxFieldWidth) {
      catFontSize = Math.max(11, Math.floor(catFontSize * (maxFieldWidth / catWidth)));
    }

    page.drawText(categoryText, {
      x: categoryConfig.x,
      y: height - categoryConfig.y,
      size: catFontSize,
      font: fontSansBold,
      color: rgb(0.12, 0.16, 0.22),
    });

    // 7. Overlay Achievement Title (Controlled Multi-line wrapping, max 2 lines)
    const titleConfig = certificateTemplate.achievementTitle;
    const rawTitle = sanitizeText(data.achievementTitle).toUpperCase();
    const prefix = titleConfig.prefix || ":   ";
    let titleFontSize = titleConfig.fontSize || 13;

    const singleLineTest = prefix + rawTitle;
    const singleLineWidth = fontSansBold.widthOfTextAtSize(singleLineTest, titleFontSize);

    if (singleLineWidth <= maxFieldWidth) {
      // Fits on a single row
      page.drawText(singleLineTest, {
        x: titleConfig.x,
        y: height - titleConfig.y,
        size: titleFontSize,
        font: fontSansBold,
        color: rgb(0.12, 0.16, 0.22),
      });
    } else {
      // Needs controlled 2-line wrap
      let wrapped = wrapText(rawTitle, fontSansBold, titleFontSize, maxFieldWidth - 25);
      if (wrapped.length > 2) {
        titleFontSize = 11.5;
        wrapped = wrapText(rawTitle, fontSansBold, titleFontSize, maxFieldWidth - 25);
      }

      if (wrapped.length > 2) {
        titleFontSize = 10.5;
        wrapped = wrapText(rawTitle, fontSansBold, titleFontSize, maxFieldWidth - 25);
      }

      if (wrapped.length > 2) {
        throw new Error(
          `Achievement title "${data.achievementTitle}" is too long to fit safely within the certificate boundaries. Maximum allowed length is 2 lines.`
        );
      }

      // Render 2 lines within the 36px band (between 894 and 978)
      const line1 = prefix + wrapped[0];
      const line2 = "    " + (wrapped[1] || "");

      page.drawText(line1, {
        x: titleConfig.x,
        y: height - (titleConfig.y - 8),
        size: titleFontSize,
        font: fontSansBold,
        color: rgb(0.12, 0.16, 0.22),
      });

      page.drawText(line2, {
        x: titleConfig.x,
        y: height - (titleConfig.y + 7),
        size: titleFontSize,
        font: fontSansBold,
        color: rgb(0.12, 0.16, 0.22),
      });
    }

    // 8. Overlay Remaining Standard Fields (Place, Record ID, Certificate Number, Date)
    const remainingFields = [
      {
        config: certificateTemplate.place,
        value: sanitizeText(data.place).toUpperCase(),
      },
      {
        config: certificateTemplate.recordId,
        value: sanitizeText(data.recordId),
      },
      {
        config: certificateTemplate.certificateNumber,
        value: sanitizeText(data.certificateNumber),
      },
      {
        config: certificateTemplate.dateOfRecognition,
        value: sanitizeText(data.dateOfRecognition).toUpperCase(),
      },
    ];

    for (const f of remainingFields) {
      const fullText = (f.config.prefix || ":   ") + f.value;
      const pdfY = height - f.config.y;
      let fontSize = f.config.fontSize || 14;
      const textWidth = fontSansBold.widthOfTextAtSize(fullText, fontSize);
      const maxWidth = f.config.maxWidth || maxFieldWidth;

      if (textWidth > maxWidth) {
        fontSize = Math.max(11, Math.floor(fontSize * (maxWidth / textWidth)));
      }

      page.drawText(fullText, {
        x: f.config.x,
        y: pdfY,
        size: fontSize,
        font: fontSansBold,
        color: rgb(0.12, 0.16, 0.22),
      });
    }

    // 9. Generate and embed Verification QR Code pointing directly to /verify/[recordId]
    const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    let baseUrl = configuredBaseUrl;

    if (!baseUrl || (process.env.NODE_ENV === "production" && (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")))) {
      baseUrl = process.env.PRODUCTION_DOMAIN || "https://wbore.com";
    }

    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const verificationUrl =
      data.verificationUrl ||
      `${cleanBaseUrl}/verify/${encodeURIComponent(data.recordId)}`;

    let qrCodeDataUrl: string;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        margin: 1,
        width: 250,
        errorCorrectionLevel: "M",
        color: {
          dark: "#0F1A30",
          light: "#00000000", // transparent
        },
      });
    } catch (qrErr: any) {
      throw new Error(`Failed to generate verification QR code: ${qrErr.message}`);
    }

    try {
      const qrImageBuffer = Buffer.from(
        qrCodeDataUrl.replace(/^data:image\/png;base64,/, ""),
        "base64"
      );
      const qrImage = await pdfDoc.embedPng(qrImageBuffer);
      const qrConfig = certificateTemplate.qrCode || { x: 825, y: 1300, size: 85 };

      page.drawImage(qrImage, {
        x: qrConfig.x,
        y: height - qrConfig.y - qrConfig.size,
        width: qrConfig.size,
        height: qrConfig.size,
      });

      // Verification label below QR
      page.drawText("SCAN TO VERIFY", {
        x: qrConfig.x + 8,
        y: height - qrConfig.y - qrConfig.size - 12,
        size: 8,
        font: fontSansRegular,
        color: rgb(0.2, 0.3, 0.45),
      });
    } catch (embedQrErr: any) {
      console.warn("Could not embed QR code on PDF:", embedQrErr.message);
    }

    // 10. Save PDF Bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // 11. Store PDF via storage adapter under certificates/[year]/[recordId].pdf
    const yearMatch = data.recordId.match(/-(\d{4})-/);
    const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
    const storageSubfolder = `certificates/${year}`;
    const pdfFilename = `${data.recordId}.pdf`;

    const uploadResult = await storage.uploadFile(
      pdfBuffer,
      pdfFilename,
      storageSubfolder,
      "application/pdf",
      { preserveFilename: true }
    );

    return {
      pdfBuffer,
      pdfUrl: uploadResult.fileUrl,
      storageKey: uploadResult.storageKey,
      qrCodeDataUrl,
      verificationUrl,
    };
  }
}

