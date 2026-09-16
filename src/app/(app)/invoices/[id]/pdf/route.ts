import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { INVOICE_STATUS_LABELS } from "@/lib/format";
import { buildCommercialPdf } from "@/lib/pdf-doc";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
        include: { customer: true, items: true, payments: true },
      }),
      prisma.company.findFirst(),
    ]);

    if (!invoice) {
      return new NextResponse("Factura no encontrada", { status: 404 });
    }

    // Prefer invoice.paymentMethod; else first payment's method
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

    const filename = `${invoice.number.replace(/[^\w.-]+/g, "_")}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[invoice pdf]", err);
    const message =
      err instanceof Error ? err.message : "Error al generar el PDF";
    return new NextResponse(`No se pudo generar el PDF: ${message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
