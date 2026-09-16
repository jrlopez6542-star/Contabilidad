import PDFDocument from "pdfkit";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { formatCOP, formatDate, PAYMENT_METHODS } from "./format";

const BRAND_GREEN = "#0b3d2e";
const BRAND_CREAM = "#fff8e7";
const BRAND_GOLD = "#d97706";
/** Small PNG for serverless (public/logo-bunuelandia.png is ~477KB). */
const DEFAULT_PDF_LOGO = "/logo-bunuelandia-pdf.png";
const FALLBACK_LOGO = "/logo-bunuelandia.png";
/** Skip embedding data-URL logos larger than this (OOM / timeout risk). */
const MAX_DATA_URL_LOGO_CHARS = 400_000;

type CompanyLike = {
  name: string;
  nit: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
} | null;

type Party = {
  name: string;
  nit: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
};

type Line = {
  description: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
  lineTotal: number;
};

/** Strip cache-busting query / hash from public paths. */
function stripUrlMeta(url: string): string {
  return url.split(/[?#]/)[0] || url;
}

/**
 * Resolve logo from PNG/JPEG data URL or /public path.
 * PDFKit only embeds PNG/JPEG reliably — skip webp/svg/gif data URLs.
 * Query strings like ?v=2 must be stripped or existsSync fails on Vercel.
 */
function loadLocalLogo(logoUrl?: string | null): Buffer | null {
  if (logoUrl && logoUrl.startsWith("data:image/")) {
    const mimeMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/i.exec(logoUrl);
    const mime = (mimeMatch?.[1] || "").toLowerCase();
    if (mime === "image/png" || mime === "image/jpeg" || mime === "image/jpg") {
      if (logoUrl.length <= MAX_DATA_URL_LOGO_CHARS) {
        const comma = logoUrl.indexOf(",");
        if (comma > 0) {
          try {
            return Buffer.from(logoUrl.slice(comma + 1), "base64");
          } catch {
            /* fall through */
          }
        }
      }
    }
    // Unsupported or huge data URL → use bundled file logo
  }

  // Prefer the compact PDF logo for the bundled brand mark (large PNG is ~477KB).
  const pathLogo =
    logoUrl && logoUrl.startsWith("/") && !logoUrl.startsWith("//")
      ? stripUrlMeta(logoUrl)
      : null;
  const isDefaultBrand =
    !pathLogo ||
    pathLogo === FALLBACK_LOGO ||
    pathLogo === DEFAULT_PDF_LOGO ||
    pathLogo.endsWith("/logo-bunuelandia.png") ||
    pathLogo === "logo-bunuelandia.png";
  const candidates = (
    isDefaultBrand
      ? [DEFAULT_PDF_LOGO, FALLBACK_LOGO]
      : [pathLogo, DEFAULT_PDF_LOGO, FALLBACK_LOGO]
  ).filter(Boolean) as string[];

  const publicRoot = path.join(process.cwd(), "public");

  for (const url of candidates) {
    const rel = stripUrlMeta(url).replace(/^\/+/, "").replace(/\.\./g, "");
    if (!rel) continue;
    const full = path.join(publicRoot, rel);
    if (!full.startsWith(publicRoot)) continue;
    if (!existsSync(full)) continue;
    try {
      return readFileSync(full);
    } catch {
      continue;
    }
  }
  return null;
}

function paymentMethodLabel(method?: string | null): string | null {
  if (!method) return null;
  return (
    PAYMENT_METHODS.find((m) => m.value === method)?.label || method || null
  );
}

export async function buildCommercialPdf(opts: {
  title: string;
  number: string;
  statusLabel: string;
  dateLabel: string;
  dateValue: Date | string | null;
  company: CompanyLike;
  party: Party;
  partyTitle: string;
  items: Line[];
  subtotal: number;
  ivaTotal: number;
  total: number;
  notes?: string;
  extraRight?: string;
  paymentMethod?: string | null;
}): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 50, size: "LETTER" });
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  try {
    const companyName = opts.company?.name || "Buñuelandia";
    const companyNit = opts.company?.nit || "";
    const logoBuf = loadLocalLogo(opts.company?.logoUrl);

    // Header bar — cream so dark-green logo lettering stays readable
    doc.rect(0, 0, 612, 96).fill(BRAND_CREAM);
    doc
      .moveTo(0, 96)
      .lineTo(612, 96)
      .strokeColor(BRAND_GREEN)
      .lineWidth(2)
      .stroke();

    let textLeft = 50;
    if (logoBuf) {
      try {
        // White plate behind logo for contrast
        doc.roundedRect(42, 12, 72, 72, 8).fill("#ffffff");
        doc.image(logoBuf, 46, 16, { fit: [64, 64] });
        textLeft = 128;
      } catch {
        // ignore bad image bytes
      }
    }

    doc
      .fillColor(BRAND_GREEN)
      .fontSize(18)
      .text(companyName, textLeft, 28, { width: 300 - (textLeft - 50) });
    doc.fontSize(9).fillColor("#475569");
    doc.text(`NIT: ${companyNit}`, textLeft, 52);
    if (opts.company?.address) {
      doc.text(opts.company.address, textLeft, 64, {
        width: 300 - (textLeft - 50),
      });
    }

    doc.fillColor(BRAND_GREEN).fontSize(14).text(opts.title, 360, 28, {
      width: 200,
      align: "right",
    });
    doc
      .fillColor("#0f172a")
      .fontSize(11)
      .text(opts.number, 360, 48, { width: 200, align: "right" });
    doc.fontSize(8).fillColor(BRAND_GOLD).text(opts.statusLabel, 360, 66, {
      width: 200,
      align: "right",
    });

    let y = 116;
    doc.fillColor("#0f172a").fontSize(10).text(opts.partyTitle, 50, y);
    y += 14;
    doc.fontSize(11).text(opts.party.name, 50, y);
    y += 14;
    doc.fontSize(9).fillColor("#475569");
    doc.text(`NIT/CC: ${opts.party.nit}`, 50, y);
    y += 12;
    if (opts.party.address) {
      doc.text(opts.party.address, 50, y, { width: 250 });
      y += 12;
    }
    if (opts.party.email) {
      doc.text(opts.party.email, 50, y);
      y += 12;
    }
    if (opts.party.phone) {
      doc.text(opts.party.phone, 50, y);
      y += 12;
    }

    doc.fillColor("#475569").fontSize(9);
    doc.text(`${opts.dateLabel}: ${formatDate(opts.dateValue)}`, 360, 110, {
      width: 200,
      align: "right",
    });
    let rightY = 124;
    if (opts.extraRight) {
      doc.text(opts.extraRight, 360, rightY, { width: 200, align: "right" });
      rightY += 14;
    }
    const payLabel = paymentMethodLabel(opts.paymentMethod);
    if (payLabel) {
      doc.text(`Método de pago: ${payLabel}`, 360, rightY, {
        width: 200,
        align: "right",
      });
    }

    y = Math.max(y, 160) + 10;
    const tableTop = y;
    doc.fontSize(8).fillColor("#64748b");
    doc.text("Descripción", 50, tableTop, { width: 220 });
    doc.text("Cant.", 280, tableTop, { width: 40, align: "right" });
    doc.text("Precio", 330, tableTop, { width: 70, align: "right" });
    doc.text("IVA", 410, tableTop, { width: 40, align: "right" });
    doc.text("Total", 460, tableTop, { width: 90, align: "right" });
    doc
      .moveTo(50, tableTop + 14)
      .lineTo(550, tableTop + 14)
      .strokeColor("#e2e8f0")
      .stroke();

    y = tableTop + 22;
    doc.fillColor("#0f172a").fontSize(9);
    for (const item of opts.items) {
      if (y > 680) {
        doc.addPage();
        y = 50;
      }
      const h = doc.heightOfString(item.description, { width: 220 });
      doc.text(item.description, 50, y, { width: 220 });
      doc.text(String(item.quantity), 280, y, { width: 40, align: "right" });
      doc.text(formatCOP(item.unitPrice), 330, y, { width: 70, align: "right" });
      doc.text(`${item.ivaRate}%`, 410, y, { width: 40, align: "right" });
      doc.text(formatCOP(item.lineTotal), 460, y, { width: 90, align: "right" });
      y += Math.max(h, 14) + 10;
    }

    y += 8;
    doc
      .moveTo(350, y)
      .lineTo(550, y)
      .strokeColor("#e2e8f0")
      .stroke();
    y += 12;
    doc.fontSize(10).fillColor("#334155");
    doc.text(`Subtotal: ${formatCOP(opts.subtotal)}`, 350, y, {
      align: "right",
      width: 200,
    });
    y += 16;
    doc.text(`IVA: ${formatCOP(opts.ivaTotal)}`, 350, y, {
      align: "right",
      width: 200,
    });
    y += 20;
    doc.roundedRect(350, y - 4, 200, 28, 4).fill("#e8f5f0");
    doc
      .fontSize(12)
      .fillColor(BRAND_GREEN)
      .text(`TOTAL: ${formatCOP(opts.total)}`, 350, y + 4, {
        align: "right",
        width: 200,
      });

    if (opts.notes) {
      y += 50;
      doc.fontSize(9).fillColor("#64748b").text(`Notas: ${opts.notes}`, 50, y, {
        width: 500,
      });
    }

    if (opts.company?.email || opts.company?.phone) {
      const contact = [opts.company.phone, opts.company.email]
        .filter(Boolean)
        .join(" · ");
      const contactY = Math.min(y + (opts.notes ? 40 : 55), 720);
      doc
        .fontSize(8)
        .fillColor("#94a3b8")
        .text(contact, 50, contactY, { align: "center", width: 500 });
    }

    doc.end();
  } catch (err) {
    try {
      doc.end();
    } catch {
      /* ignore */
    }
    throw err;
  }

  return done;
}

/** mm → PDF points (1 in = 25.4 mm = 72 pt) */
function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

function truncateText(text: string, maxChars: number): string {
  const t = (text || "").trim();
  if (t.length <= maxChars) return t;
  return t.slice(0, Math.max(0, maxChars - 1)) + "…";
}

export type ThermalWidthMm = 58 | 80;

/**
 * Compact monochrome ticket for 58/80mm thermal printers.
 * Default width 58mm (~164 pt). No cream header, no DIAN disclaimer.
 */
export async function buildThermalTicketPdf(opts: {
  title: string;
  number: string;
  dateLabel: string;
  dateValue: Date | string | null;
  company: CompanyLike;
  party: Party;
  items: Line[];
  subtotal: number;
  ivaTotal: number;
  total: number;
  notes?: string;
  paymentMethod?: string | null;
  /** Paper width in mm; default 58. */
  widthMm?: ThermalWidthMm | number;
  extraLine?: string;
}): Promise<Buffer> {
  const widthMm =
    opts.widthMm === 80 || Number(opts.widthMm) === 80 ? 80 : 58;
  const pageWidth = Math.round(mmToPt(widthMm)); // ~164 or ~227
  const margin = widthMm === 58 ? 8 : 10;
  const contentWidth = pageWidth - margin * 2;
  const maxDescChars = widthMm === 58 ? 28 : 36;

  // Estimate height from content (grow with line items)
  const estimated =
    120 +
    opts.items.length * 36 +
    (opts.notes ? 40 : 0) +
    (opts.extraLine ? 16 : 0) +
    80;
  const pageHeight = Math.max(600, Math.min(estimated, 2000));

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({
    margin,
    size: [pageWidth, pageHeight],
    autoFirstPage: true,
  });
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  try {
    const companyName = opts.company?.name || "Buñuelandia";
    const companyNit = opts.company?.nit || "";
    const logoBuf = loadLocalLogo(opts.company?.logoUrl);
    const ink = "#000000";
    let y = margin;

    // Tiny logo centered (optional)
    if (logoBuf) {
      try {
        const logoSize = widthMm === 58 ? 36 : 44;
        const logoX = (pageWidth - logoSize) / 2;
        doc.image(logoBuf, logoX, y, { fit: [logoSize, logoSize] });
        y += logoSize + 4;
      } catch {
        /* ignore bad image */
      }
    }

    doc.fillColor(ink).font("Helvetica-Bold").fontSize(10);
    doc.text(companyName, margin, y, {
      width: contentWidth,
      align: "center",
    });
    y = doc.y + 2;

    doc.font("Helvetica").fontSize(7);
    if (companyNit) {
      doc.text(`NIT: ${companyNit}`, margin, y, {
        width: contentWidth,
        align: "center",
      });
      y = doc.y + 1;
    }
    if (opts.company?.address) {
      doc.text(truncateText(opts.company.address, maxDescChars + 8), margin, y, {
        width: contentWidth,
        align: "center",
      });
      y = doc.y + 1;
    }
    if (opts.company?.phone) {
      doc.text(`Tel: ${opts.company.phone}`, margin, y, {
        width: contentWidth,
        align: "center",
      });
      y = doc.y + 2;
    }

    y += 4;
    doc
      .moveTo(margin, y)
      .lineTo(pageWidth - margin, y)
      .strokeColor(ink)
      .lineWidth(0.8)
      .stroke();
    y += 6;

    doc.font("Helvetica-Bold").fontSize(9);
    doc.text(opts.title, margin, y, { width: contentWidth, align: "center" });
    y = doc.y + 1;
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(opts.number, margin, y, { width: contentWidth, align: "center" });
    y = doc.y + 4;

    doc.font("Helvetica").fontSize(7);
    doc.text(`${opts.dateLabel}: ${formatDate(opts.dateValue)}`, margin, y, {
      width: contentWidth,
      align: "left",
    });
    y = doc.y + 1;

    const payLabel = paymentMethodLabel(opts.paymentMethod);
    if (payLabel) {
      doc.text(`Pago: ${payLabel}`, margin, y, {
        width: contentWidth,
        align: "left",
      });
      y = doc.y + 1;
    }
    if (opts.extraLine) {
      doc.text(opts.extraLine, margin, y, {
        width: contentWidth,
        align: "left",
      });
      y = doc.y + 1;
    }

    y += 4;
    doc
      .moveTo(margin, y)
      .lineTo(pageWidth - margin, y)
      .strokeColor(ink)
      .lineWidth(0.5)
      .stroke();
    y += 5;

    doc.font("Helvetica-Bold").fontSize(7);
    doc.text("Cliente", margin, y, { width: contentWidth });
    y = doc.y + 1;
    doc.font("Helvetica").fontSize(8);
    doc.text(truncateText(opts.party.name, maxDescChars), margin, y, {
      width: contentWidth,
    });
    y = doc.y + 1;
    doc.fontSize(7);
    doc.text(`CC/NIT: ${opts.party.nit}`, margin, y, { width: contentWidth });
    y = doc.y + 4;

    doc
      .moveTo(margin, y)
      .lineTo(pageWidth - margin, y)
      .strokeColor(ink)
      .lineWidth(0.5)
      .stroke();
    y += 5;

    // Line items — stacked for narrow width
    for (const item of opts.items) {
      if (y > pageHeight - 80) {
        doc.addPage({ size: [pageWidth, pageHeight], margin });
        y = margin;
      }
      const desc = truncateText(item.description, maxDescChars);
      doc.font("Helvetica").fontSize(8).fillColor(ink);
      doc.text(desc, margin, y, { width: contentWidth });
      y = doc.y + 1;
      doc.fontSize(7);
      const qtyLine = `${item.quantity} x ${formatCOP(item.unitPrice)}`;
      doc.text(qtyLine, margin, y, { width: contentWidth * 0.55, align: "left" });
      doc.text(formatCOP(item.lineTotal), margin + contentWidth * 0.45, y, {
        width: contentWidth * 0.55,
        align: "right",
      });
      y = Math.max(doc.y, y + 10) + 3;
    }

    y += 2;
    doc
      .moveTo(margin, y)
      .lineTo(pageWidth - margin, y)
      .strokeColor(ink)
      .lineWidth(0.8)
      .stroke();
    y += 6;

    doc.font("Helvetica").fontSize(8).fillColor(ink);
    const row = (label: string, value: string, bold = false) => {
      if (bold) doc.font("Helvetica-Bold").fontSize(10);
      else doc.font("Helvetica").fontSize(8);
      doc.text(label, margin, y, { width: contentWidth * 0.45, align: "left" });
      doc.text(value, margin + contentWidth * 0.4, y, {
        width: contentWidth * 0.6,
        align: "right",
      });
      y += bold ? 14 : 12;
    };

    row("Subtotal", formatCOP(opts.subtotal));
    row("IVA", formatCOP(opts.ivaTotal));
    row("TOTAL", formatCOP(opts.total), true);

    if (opts.notes) {
      y += 4;
      doc.font("Helvetica").fontSize(6).fillColor(ink);
      doc.text(`Notas: ${truncateText(opts.notes, 120)}`, margin, y, {
        width: contentWidth,
      });
      y = doc.y + 4;
    }

    y += 6;
    doc
      .moveTo(margin, y)
      .lineTo(pageWidth - margin, y)
      .strokeColor(ink)
      .lineWidth(0.5)
      .stroke();
    y += 8;
    doc.font("Helvetica").fontSize(7);
    doc.text("¡Gracias por su compra!", margin, y, {
      width: contentWidth,
      align: "center",
    });

    doc.end();
  } catch (err) {
    try {
      doc.end();
    } catch {
      /* ignore */
    }
    throw err;
  }

  return done;
}
