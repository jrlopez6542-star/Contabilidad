import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INVOICE_STATUS_LABELS } from "@/lib/format";
import { buildCommercialPdf } from "@/lib/pdf-doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rawId = (params.id || "").trim();
    if (!rawId) {
      return new NextResponse("ID de factura inválido", { status: 400 });
    }

    // Buscar por ID (cuid) o por número de factura (B-0005)
    const [invoice, company] = await Promise.all([
      prisma.invoice.findFirst({
        where: {
          OR: [{ id: rawId }, { number: rawId }],
        },
        include: { customer: true, items: true, payments: true },
      }),
      prisma.company.findFirst(),
    ]);

    if (!invoice) {
      return new NextResponse("Factura no encontrada", { status: 404 });
    }

    const paymentMethod =
      invoice.paymentMethod ||
      invoice.payments[0]?.method ||
      null;

    const pdf = await buildCommercialPdf({
      title: "FACTURA DE VENTA",
      number: invoice.number,
      statusLabel: INVOICE_STATUS_LABELS[invoice.status] || invoice.status,
      dateLabel: "Emisión",
      dateValue: invoice.issuedAt || invoice.createdAt,
      company,
      party: invoice.customer,
      partyTitle: "Facturar a:",
      items: invoice.items,
      subtotal: invoice.subtotal,
      ivaTotal: invoice.ivaTotal,
      total: invoice.total,
      notes: invoice.notes,
      paymentMethod,
    });

    const filename = `Factura_${invoice.number.replace(/[^\w.-]+/g, "_")}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("[public invoice pdf]", err);
    const message =
      err instanceof Error ? err.message : "Error al generar el PDF";
    return new NextResponse(`No se pudo generar el PDF: ${message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
