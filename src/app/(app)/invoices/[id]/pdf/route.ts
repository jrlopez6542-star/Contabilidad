import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { formatCOP, formatDate, INVOICE_STATUS_LABELS } from "@/lib/format";

export const runtime = "nodejs";


export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", _req.url));
  }
  if (!can(session.role, "invoices:read")) {
    return NextResponse.redirect(new URL("/dashboard", _req.url));
  }

  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: params.id },
      include: { customer: true, items: true },
    }),
    prisma.company.findFirst(),
  ]);

  if (!invoice) {
    return new NextResponse("Factura no encontrada", { status: 404 });
  }

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 50, size: "LETTER" });

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const companyName = company?.name || "Mi Empresa";
  const companyNit = company?.nit || "";
  const companyAddress = company?.address || "";
  const companyPhone = company?.phone || "";

  doc.fontSize(18).fillColor("#047857").text(companyName, { align: "left" });
  doc
    .fontSize(10)
    .fillColor("#334155")
    .text(`NIT: ${companyNit}`)
    .text(companyAddress)
    .text(companyPhone ? `Tel: ${companyPhone}` : "");

  doc.moveDown();
  doc
    .fontSize(16)
    .fillColor("#0f172a")
    .text(`FACTURA ${invoice.number}`, { align: "right" });
  doc
    .fontSize(10)
    .fillColor("#64748b")
    .text(`Estado: ${INVOICE_STATUS_LABELS[invoice.status] || invoice.status}`, {
      align: "right",
    })
    .text(`Emisión: ${formatDate(invoice.issuedAt || invoice.createdAt)}`, {
      align: "right",
    });

  doc.moveDown();
  doc.fontSize(11).fillColor("#0f172a").text("Facturar a:");
  doc
    .fontSize(10)
    .fillColor("#334155")
    .text(invoice.customer.name)
    .text(`NIT/CC: ${invoice.customer.nit}`)
    .text(invoice.customer.address || "")
    .text(invoice.customer.email || "");

  doc.moveDown();
  const tableTop = doc.y;
  doc.fontSize(9).fillColor("#64748b");
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

  let y = tableTop + 22;
  doc.fillColor("#0f172a").fontSize(9);
  for (const item of invoice.items) {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    doc.text(item.description, 50, y, { width: 220 });
    doc.text(String(item.quantity), 280, y, { width: 40, align: "right" });
    doc.text(formatCOP(item.unitPrice), 330, y, { width: 70, align: "right" });
    doc.text(`${item.ivaRate}%`, 410, y, { width: 40, align: "right" });
    doc.text(formatCOP(item.lineTotal), 460, y, { width: 90, align: "right" });
    y += 28;
  }

  y += 10;
  doc.fontSize(10).fillColor("#334155");
  doc.text(`Subtotal: ${formatCOP(invoice.subtotal)}`, 350, y, {
    align: "right",
    width: 200,
  });
  y += 16;
  doc.text(`IVA: ${formatCOP(invoice.ivaTotal)}`, 350, y, {
    align: "right",
    width: 200,
  });
  y += 18;
  doc
    .fontSize(12)
    .fillColor("#047857")
    .text(`TOTAL: ${formatCOP(invoice.total)}`, 350, y, {
      align: "right",
      width: 200,
    });

  if (invoice.notes) {
    y += 40;
    doc.fontSize(9).fillColor("#64748b").text(`Notas: ${invoice.notes}`, 50, y, {
      width: 500,
    });
  }

  doc
    .fontSize(8)
    .fillColor("#94a3b8")
    .text(
      "Documento interno — No es factura electrónica DIAN.",
      50,
      740,
      { align: "center", width: 500 }
    );

  doc.end();
  const pdf = await done;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
    },
  });
}
