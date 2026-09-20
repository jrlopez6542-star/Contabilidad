import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { toCsv } from "@/lib/csv";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

async function buildFiles() {
  const [customers, products, invoices, items, payments, expenses, quotes, quoteItems] =
    await Promise.all([
      prisma.customer.findMany(),
      prisma.product.findMany(),
      prisma.invoice.findMany(),
      prisma.invoiceItem.findMany(),
      prisma.payment.findMany(),
      prisma.expense.findMany(),
      prisma.quote.findMany(),
      prisma.quoteItem.findMany(),
    ]);

  return {
    "clientes.csv": toCsv(
      ["id", "nombre", "nit", "email", "telefono", "direccion", "creado"],
      customers.map((c) => [
        c.id,
        c.name,
        c.nit,
        c.email,
        c.phone,
        c.address,
        c.createdAt.toISOString(),
      ])
    ),
    "productos.csv": toCsv(
      [
        "id",
        "sku",
        "nombre",
        "precio",
        "iva",
        "stock",
        "minStock",
        "trackStock",
        "activo",
      ],
      products.map((p) => [
        p.id,
        p.sku,
        p.name,
        p.price,
        p.ivaRate,
        p.stock,
        p.minStock,
        p.trackStock ? 1 : 0,
        p.active ? 1 : 0,
      ])
    ),
    "facturas.csv": toCsv(
      [
        "id",
        "numero",
        "clienteId",
        "estado",
        "subtotal",
        "iva",
        "total",
        "notas",
        "emitida",
        "quoteId",
      ],
      invoices.map((i) => [
        i.id,
        i.number,
        i.customerId,
        i.status,
        i.subtotal,
        i.ivaTotal,
        i.total,
        i.notes,
        i.issuedAt?.toISOString() || "",
        i.quoteId || "",
      ])
    ),
    "factura-items.csv": toCsv(
      [
        "id",
        "facturaId",
        "productoId",
        "descripcion",
        "cantidad",
        "precio",
        "iva",
        "subtotal",
        "lineIva",
        "total",
      ],
      items.map((i) => [
        i.id,
        i.invoiceId,
        i.productId || "",
        i.description,
        i.quantity,
        i.unitPrice,
        i.ivaRate,
        i.lineSubtotal,
        i.lineIva,
        i.lineTotal,
      ])
    ),
    "pagos.csv": toCsv(
      ["id", "facturaId", "monto", "metodo", "fecha", "notas"],
      payments.map((p) => [
        p.id,
        p.invoiceId,
        p.amount,
        p.method,
        p.paidAt.toISOString(),
        p.notes,
      ])
    ),
    "gastos.csv": toCsv(
      ["id", "fecha", "categoria", "monto", "notas"],
      expenses.map((e) => [
        e.id,
        e.date.toISOString().slice(0, 10),
        e.category,
        e.amount,
        e.notes,
      ])
    ),
    "cotizaciones.csv": toCsv(
      [
        "id",
        "numero",
        "clienteId",
        "estado",
        "subtotal",
        "iva",
        "total",
        "notas",
        "validaHasta",
      ],
      quotes.map((q) => [
        q.id,
        q.number,
        q.customerId,
        q.status,
        q.subtotal,
        q.ivaTotal,
        q.total,
        q.notes,
        q.validUntil?.toISOString().slice(0, 10) || "",
      ])
    ),
    "cotizacion-items.csv": toCsv(
      [
        "id",
        "cotizacionId",
        "productoId",
        "descripcion",
        "cantidad",
        "precio",
        "iva",
        "total",
      ],
      quoteItems.map((i) => [
        i.id,
        i.quoteId,
        i.productId || "",
        i.description,
        i.quantity,
        i.unitPrice,
        i.ivaRate,
        i.lineTotal,
      ])
    ),
  };
}

const ONLY_MAP: Record<string, string> = {
  customers: "clientes.csv",
  products: "productos.csv",
  invoices: "facturas.csv",
  expenses: "gastos.csv",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "backup:export")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const files = await buildFiles();
  const only = req.nextUrl.searchParams.get("only");

  if (only && ONLY_MAP[only]) {
    const name = ONLY_MAP[only] as keyof typeof files;
    await writeAudit(session, "create", "backup", "", `Exportó ${name}`);
    return new NextResponse(files[name], {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  await writeAudit(session, "create", "backup", "", "Exportó ZIP completo");

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="contabilidad-backup.csv.zip"',
      "Cache-Control": "no-store",
    },
  });
}
