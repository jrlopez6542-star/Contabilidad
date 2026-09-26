import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

/**
 * Construye los CSV del respaldo (clientes, productos, facturas, ítems,
 * pagos, gastos, cotizaciones). Compartido por la descarga manual
 * (/backup/export) y el respaldo diario automático (/api/cron/backup).
 * No incluye usuarios ni contraseñas.
 */
export async function buildFiles() {
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

export type BackupFiles = Awaited<ReturnType<typeof buildFiles>>;

/** ZIP con todos los CSV del respaldo. */
export async function buildBackupZip(files?: BackupFiles): Promise<Buffer> {
  const all = files ?? (await buildFiles());
  const zip = new JSZip();
  for (const [name, content] of Object.entries(all)) {
    zip.file(name, content);
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
