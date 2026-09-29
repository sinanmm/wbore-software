import fs from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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
  qrCodeDataUrl: string;
}

export class CertificateGenerator {
  /**
   * Generates a high-resolution A4 Certificate PDF by overlaying dynamic text
   * onto the official WBRE base template image.
   */
  public static async generate(
    data: GenerateCertificateData
  ): Promise<GeneratedCertificateResult> {
    // 1. Load base template image
    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "certificate-template.png"
    );
    const templateBytes = await fs.readFile(templatePath);

    // 2. Initialize PDF Document
    const pdfDoc = await PDFDocument.create();
    const bgImage = await pdfDoc.embedPng(templateBytes);
    const { width, height } = bgImage;

    // 3. Add Page with exact template dimensions (1055 x 1491 px)
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(bgImage, { x: 0, y: 0, width, height });

    // 4. Embed typography fonts
    const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const fontSansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSansRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 5. Clean recipient watermark area with matched parchment tint
    // Template parchment background color: rgb(0.988, 0.980, 0.957)
    page.drawRectangle({
      x: 180,
      y: height - 765,
      width: 695,
      height: 48,
      color: rgb(0.988, 0.98, 0.957),
    });

    // 6. Overlay Recipient Name (Centered)
    const nameText = data.recipientName.toUpperCase().trim();
    let nameFontSize = certificateTemplate.recipientName.fontSize;
    let nameWidth = fontSerifBold.widthOfTextAtSize(nameText, nameFontSize);

    // Dynamic font resizing for long names
    const maxNameWidth = certificateTemplate.recipientName.maxWidth || 700;
    if (nameWidth > maxNameWidth) {
      nameFontSize = Math.floor(nameFontSize * (maxNameWidth / nameWidth));
      nameWidth = fontSerifBold.widthOfTextAtSize(nameText, nameFontSize);
    }

    const nameX = (width - nameWidth) / 2;
    const nameY = height - certificateTemplate.recipientName.y;

    page.drawText(nameText, {
      x: nameX,
      y: nameY,
      size: nameFontSize,
      font: fontSerifBold,
      color: rgb(0.06, 0.12, 0.24), // deep royal navy
    });

    // 7. Overlay Record Information Values
    const fields = [
      {
        config: certificateTemplate.category,
        value: data.category.toUpperCase(),
      },
      {
        config: certificateTemplate.achievementTitle,
        value: data.achievementTitle.toUpperCase(),
      },
      {
        config: certificateTemplate.place,
        value: data.place.toUpperCase(),
      },
      {
        config: certificateTemplate.recordId,
        value: data.recordId,
      },
      {
        config: certificateTemplate.certificateNumber,
        value: data.certificateNumber,
      },
      {
        config: certificateTemplate.dateOfRecognition,
        value: data.dateOfRecognition.toUpperCase(),
      },
    ];

    for (const f of fields) {
      const fullText = (f.config.prefix || "") + f.value;
      const pdfY = height - f.config.y - 12; // baseline offset
      let fontSize = f.config.fontSize;
      const textWidth = fontSansBold.widthOfTextAtSize(fullText, fontSize);

      if (f.config.maxWidth && textWidth > f.config.maxWidth) {
        fontSize = Math.max(11, Math.floor(fontSize * (f.config.maxWidth / textWidth)));
      }

      page.drawText(fullText, {
        x: f.config.x,
        y: pdfY,
        size: fontSize,
        font: fontSansBold,
        color: rgb(0.12, 0.16, 0.22),
      });
    }

    // 8. Generate and embed Verification QR Code
    const verifyTarget =
      data.verificationUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL || "https://wbre.org"}/verify?recordId=${encodeURIComponent(data.recordId)}`;

    const qrCodeDataUrl = await QRCode.toDataURL(verifyTarget, {
      margin: 1,
      width: 200,
      color: {
        dark: "#0F1A30",
        light: "#FFFFFF00", // transparent bg
      },
    });

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

      // Small caption under QR
      page.drawText("SCAN TO VERIFY", {
        x: qrConfig.x + 8,
        y: height - qrConfig.y - qrConfig.size - 12,
        size: 8,
        font: fontSansRegular,
        color: rgb(0.2, 0.3, 0.45),
      });
    } catch (qrErr) {
      console.warn("Could not embed QR code on PDF:", qrErr);
    }

    // 9. Save PDF Bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // 10. Store PDF via storage adapter
    const pdfFilename = `${data.certificateNumber}.pdf`;
    const uploadResult = await storage.uploadFile(
      pdfBuffer,
      pdfFilename,
      "certificates",
      "application/pdf"
    );

    return {
      pdfBuffer,
      pdfUrl: uploadResult.fileUrl,
      qrCodeDataUrl,
    };
  }
}
