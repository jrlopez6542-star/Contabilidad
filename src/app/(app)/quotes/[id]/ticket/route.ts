import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { formatDate } from "@/lib/format";
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
    if (!can(session.role, "quotes:read")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const widthMm = parseWidth(req);

    const [quote, company] = await Promise.all([
      prisma.quote.findUnique({
        where: { id: params.id },
        include: { customer: true, items: true },
      }),
      prisma.company.findFirst(),
    ]);

    if (!quote) {
      return new NextResponse("Cotización no encontrada", { status: 404 });
    }

    const pdf = await buildThermalTicketPdf({
      title: "COTIZACIÓN",
      number: quote.number,
      dateLabel: "Fecha",
      dateValue: quote.createdAt,
      company,
      party: quote.customer,
      items: quote.items,
      subtotal: quote.subtotal,
      ivaTotal: quote.ivaTotal,
      total: quote.total,
      notes: quote.notes || undefined,
      widthMm,
      extraLine: quote.validUntil
        ? `Válida hasta: ${formatDate(quote.validUntil)}`
        : undefined,
    });

    const filename = `${quote.number.replace(/[^\w.-]+/g, "_")}-ticket.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[quote ticket]", err);
    const message =
      err instanceof Error ? err.message : "Error al generar el ticket";
    return new NextResponse(`No se pudo generar el ticket: ${message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
