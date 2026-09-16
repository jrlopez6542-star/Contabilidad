import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { buildThermalTicketPdf, type ThermalWidthMm } from "@/lib/pdf-doc";

export const runtime = "nodejs";

function parseWidth(req: NextRequest): ThermalWidthMm {
  const w = req.nextUrl.searchParams.get("width");
  return w === "80" ? 80 : 58;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!can(session.role, "invoices:read")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const widthMm = parseWidth(req);

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

    const paymentMethod =
      invoice.paymentMethod || invoice.payments[0]?.method || null;

    const pdf = await buildThermalTicketPdf({
      title: "FACTURA DE VENTA",
      number: invoice.number,
      dateLabel: "Fecha",
      dateValue: invoice.issuedAt || invoice.createdAt,
      company,
      party: invoice.customer,
      items: invoice.items,
      subtotal: invoice.subtotal,
      ivaTotal: invoice.ivaTotal,
      total: invoice.total,
      notes: invoice.notes || undefined,
      paymentMethod,
      widthMm,
    });

    const filename = `${invoice.number.replace(/[^\w.-]+/g, "_")}-ticket.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[invoice ticket]", err);
    const message =
      err instanceof Error ? err.message : "Error al generar el ticket";
    return new NextResponse(`No se pudo generar el ticket: ${message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
