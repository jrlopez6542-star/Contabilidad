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

    // Extraer Entrega y Email específicos de la orden desde invoice.notes
    let orderAddress = "";
    let orderEmail = "";
    const isWhatsAppOrder = (invoice.notes || "").includes("Pedido WhatsApp:");
    if (invoice.notes) {
      const entregaMatch = invoice.notes.match(/(?:^|·\s*)Entrega:\s*([^·]+)/);
      if (entregaMatch) {
        orderAddress = entregaMatch[1].trim();
      }
      const emailMatch = invoice.notes.match(/(?:^|·\s*)Email:\s*([^·]+)/);
      if (emailMatch) {
        orderEmail = emailMatch[1].trim();
      }
    }

    const party = invoice.customer
      ? {
          name: invoice.customer.name,
          nit: invoice.customer.nit,
          address: isWhatsAppOrder ? (orderAddress || "") : (invoice.customer.address || ""),
          email: isWhatsAppOrder ? (orderEmail || "") : (invoice.customer.email || ""),
          phone: invoice.customer.phone || "",
        }
      : {
          name: "Consumidor Final",
          nit: "222222222222",
          address: orderAddress || "",
          email: orderEmail || "",
          phone: "",
        };

    const pdf = await buildCommercialPdf({
      title: "FACTURA DE VENTA",
      number: invoice.number,
      statusLabel: INVOICE_STATUS_LABELS[invoice.status] || invoice.status,
      dateLabel: "Emisión",
      dateValue: invoice.issuedAt || invoice.createdAt,
      company,
      party,
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
