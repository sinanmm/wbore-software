/**
 * Certificate Template Configuration
 * Defines canvas and PDF rendering coordinates for World Book of Record Excellence certificates.
 * Base image dimensions: 1055 x 1491 px (A4 portrait ratio).
 */

export interface FieldCoordinate {
  x: number;
  y: number;
  fontSize: number;
  fontFamily?: string;
  color?: string;
  align?: "left" | "center" | "right";
  maxWidth?: number;
  prefix?: string;
}

export interface CertificateTemplateConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundImageUrl: string;
  recipientName: FieldCoordinate;
  category: FieldCoordinate;
  achievementTitle: FieldCoordinate;
  place: FieldCoordinate;
  recordId: FieldCoordinate;
  certificateNumber: FieldCoordinate;
  dateOfRecognition: FieldCoordinate;
  qrCode?: {
    x: number;
    y: number;
    size: number;
  };
}

export const certificateTemplate: CertificateTemplateConfig = {
  id: "wbre-official-a4-portrait-v1",
  name: "WBRE Official Certificate of Excellence",
  width: 1055,
  height: 1491,
  backgroundImageUrl: "/templates/certificate-template.png",

  // Recipient Name (Prominently displayed in center honor line)
  recipientName: {
    x: 527.5,
    y: 742,
    fontSize: 38,
    fontFamily: "Cinzel, Times, serif",
    color: "#0F1E3D",
    align: "center",
    maxWidth: 720,
  },

  // Aligned precisely to the right of the pre-printed labels on template
  category: {
    x: 445,
    y: 894,
    fontSize: 14,
    fontFamily: "Helvetica, Arial, sans-serif",
    color: "#1E293B",
    align: "left",
    maxWidth: 440,
    prefix: ":   ",
  },

  achievementTitle: {
    x: 445,
    y: 942,
    fontSize: 13,
    fontFamily: "Helvetica, Arial, sans-serif",
    color: "#1E293B",
    align: "left",
    maxWidth: 440,
    prefix: ":   ",
  },

  place: {
    x: 445,
    y: 978,
    fontSize: 14,
    fontFamily: "Helvetica, Arial, sans-serif",
    color: "#1E293B",
    align: "left",
    maxWidth: 440,
    prefix: ":   ",
  },

  recordId: {
    x: 445,
    y: 1007,
    fontSize: 14,
    fontFamily: "Helvetica, Arial, sans-serif",
    color: "#1E293B",
    align: "left",
    maxWidth: 440,
    prefix: ":   ",
  },

  certificateNumber: {
    x: 445,
    y: 1037,
    fontSize: 14,
    fontFamily: "Helvetica, Arial, sans-serif",
    color: "#1E293B",
    align: "left",
    maxWidth: 440,
    prefix: ":   ",
  },

  dateOfRecognition: {
    x: 445,
    y: 1067,
    fontSize: 14,
    fontFamily: "Helvetica, Arial, sans-serif",
    color: "#1E293B",
    align: "left",
    maxWidth: 440,
    prefix: ":   ",
  },

  qrCode: {
    x: 835,
    y: 1335,
    size: 70,
  },
};

export default certificateTemplate;
