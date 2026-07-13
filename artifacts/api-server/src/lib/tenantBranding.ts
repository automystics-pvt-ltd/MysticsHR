import { PDFDocument, PDFImage } from "pdf-lib";
import { db } from "./db";
import { tenantsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

// ─── Payslip letterhead ──────────────────────────────────────────────────────

export interface PayslipLetterhead {
  companyName: string;
  addressLine1: string;
  brandColorHex: string; // e.g. "#1e293b"
  logoDataUri: string | null;
  footerNote: string;
}

// These match today's hardcoded output exactly, so tenants that never touch
// the new "Payslip & ID Card Design" admin tab see no visual change.
export const DEFAULT_PAYSLIP_LETTERHEAD: PayslipLetterhead = {
  companyName: "Automystics Technologies",
  addressLine1: "",
  brandColorHex: "#1e293b",
  logoDataUri: null,
  footerNote: "",
};

export async function getPayslipLetterhead(tenantId: number): Promise<PayslipLetterhead> {
  const [row] = await db.select({ payslipConfig: tenantsTable.payslipConfig })
    .from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
  const cfg = (row?.payslipConfig ?? null) as Partial<PayslipLetterhead> | null;
  if (!cfg) return DEFAULT_PAYSLIP_LETTERHEAD;
  return {
    companyName: cfg.companyName?.trim() || DEFAULT_PAYSLIP_LETTERHEAD.companyName,
    addressLine1: cfg.addressLine1?.trim() ?? DEFAULT_PAYSLIP_LETTERHEAD.addressLine1,
    brandColorHex: cfg.brandColorHex?.trim() || DEFAULT_PAYSLIP_LETTERHEAD.brandColorHex,
    logoDataUri: cfg.logoDataUri || null,
    footerNote: cfg.footerNote?.trim() ?? DEFAULT_PAYSLIP_LETTERHEAD.footerNote,
  };
}

// ─── ID card design ──────────────────────────────────────────────────────────

export interface IdCardFields {
  photo: boolean;
  nameAndId: boolean;
  designationDept: boolean;
  bloodGroup: boolean;
  qrCode: boolean;
  emergencyContact: boolean;
  signatureLine: boolean;
}

export interface IdCardConfig {
  cardTitle: string;
  companyName: string;
  brandColorHex: string;
  logoDataUri: string | null;
  fields: IdCardFields;
}

// Matches today's hardcoded card exactly: name/ID/department + QR always
// shown, photo placeholder shown, no blood group / emergency contact /
// signature line.
export const DEFAULT_ID_CARD_CONFIG: IdCardConfig = {
  cardTitle: "EMPLOYEE ID CARD",
  companyName: "AUTOMYSTICS TECHNOLOGIES",
  brandColorHex: "#3b82f6",
  logoDataUri: null,
  fields: {
    photo: true,
    nameAndId: true,
    designationDept: true,
    bloodGroup: false,
    qrCode: true,
    emergencyContact: false,
    signatureLine: false,
  },
};

export async function getIdCardConfig(tenantId: number): Promise<IdCardConfig> {
  const [row] = await db.select({ idCardConfig: tenantsTable.idCardConfig })
    .from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
  const cfg = (row?.idCardConfig ?? null) as Partial<IdCardConfig> | null;
  if (!cfg) return DEFAULT_ID_CARD_CONFIG;
  return {
    cardTitle: cfg.cardTitle?.trim() || DEFAULT_ID_CARD_CONFIG.cardTitle,
    companyName: cfg.companyName?.trim() || DEFAULT_ID_CARD_CONFIG.companyName,
    brandColorHex: cfg.brandColorHex?.trim() || DEFAULT_ID_CARD_CONFIG.brandColorHex,
    logoDataUri: cfg.logoDataUri || null,
    fields: { ...DEFAULT_ID_CARD_CONFIG.fields, ...(cfg.fields ?? {}) },
  };
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** #rrggbb -> pdf-lib rgb() triple (0..1 floats). Falls back to black on bad input. */
export function hexToRgbTriple(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const int = parseInt(m[1], 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

/** Embed a data-URI (or bare base64) image into a pdf-lib document. Returns null on any failure — logos are cosmetic and must never break document generation. */
export async function embedLogoImage(pdfDoc: PDFDocument, dataUri: string | null | undefined): Promise<PDFImage | null> {
  if (!dataUri) return null;
  try {
    const match = /^data:(image\/(png|jpe?g));base64,(.+)$/i.exec(dataUri);
    const mime = match?.[2]?.toLowerCase();
    const base64 = match ? match[3] : dataUri;
    const bytes = Buffer.from(base64, "base64");
    if (mime === "jpeg" || mime === "jpg") return await pdfDoc.embedJpg(bytes);
    return await pdfDoc.embedPng(bytes);
  } catch (e) {
    console.error("Logo embed failed (non-fatal):", e);
    return null;
  }
}
