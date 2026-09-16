import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { QUOTE_STATUS_LABELS, formatDate } from "@/lib/format";
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
    if (!can(session.role, "quotes:read")) {
      return NextResponse.redirect(new URL("/dashboard", _req.url));
    }

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

    const pdf = await buildCommercialPdf({
      title: "COTIZACIÓN",
      number: quote.number,
      statusLabel: QUOTE_STATUS_LABELS[quote.status] || quote.status,
      dateLabel: "Fecha",
      dateValue: quote.createdAt,
      company,
      party: quote.customer,
      partyTitle: "Cliente:",
      items: quote.items,
      subtotal: quote.subtotal,
      ivaTotal: quote.ivaTotal,
      total: quote.total,
      notes: quote.notes,
      extraRight: quote.validUntil
        ? `Válida hasta: ${formatDate(quote.validUntil)}`
        : undefined,
    });

    const filename = `${quote.number.replace(/[^\w.-]+/g, "_")}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[quote pdf]", err);
    const message =
      err instanceof Error ? err.message : "Error al generar el PDF";
    return new NextResponse(`No se pudo generar el PDF: ${message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
