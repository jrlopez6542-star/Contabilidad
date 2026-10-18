import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { restoreStockForItems } from "./inventory";
import { restorePackagingForItems } from "./packaging";
import { writeAudit } from "./audit";
import type { SessionUser } from "./auth";

export type LineInput = {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
};

type ComputedLine = LineInput & {
  lineSubtotal: number;
  lineIva: number;
  lineTotal: number;
};

function calcLine(item: LineInput) {
  const lineSubtotal = Math.round(item.quantity * item.unitPrice);
  const lineIva = Math.round(lineSubtotal * (item.ivaRate / 100));
  const lineTotal = lineSubtotal + lineIva;
  return { lineSubtotal, lineIva, lineTotal };
}

export function calcTotals(items: LineInput[]) {
  let subtotal = 0;
  let ivaTotal = 0;
  let total = 0;
  const computed: ComputedLine[] = items.map((item) => {
    const c = calcLine(item);
    subtotal += c.lineSubtotal;
    ivaTotal += c.lineIva;
    total += c.lineTotal;
    return { ...item, ...c };
  });
  return { items: computed, subtotal, ivaTotal, total };
}

export async function allocateInvoiceNumber() {
  return prisma.$transaction(async (tx) => {
    let company = await tx.company.findFirst();
    if (!company) {
      company = await tx.company.create({
        data: {
          name: "Buñuelandia",
          nit: "900000000-0",
          logoUrl: "/logo-bunuelandia.png",
        },
      });
    }
    const number = `${company.invoicePrefix}-${String(company.nextInvoiceNumber).padStart(4, "0")}`;
    await tx.company.update({
      where: { id: company.id },
      data: { nextInvoiceNumber: company.nextInvoiceNumber + 1 },
    });
    return number;
  });
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Recalculate Company.nextInvoiceNumber from remaining invoices that match
 * the CURRENT company.invoicePrefix (PREFIX-####). Does not renumber invoices.
 * Returns the new nextInvoiceNumber (max suffix + 1, or 1 if none).
 */
export async function syncNextInvoiceNumber(
  tx: Prisma.TransactionClient
): Promise<number> {
  const company = await tx.company.findFirst();
  if (!company) return 1;

  const prefix = company.invoicePrefix;
  const last = await tx.invoice.findFirst({
    where: { number: { startsWith: `${prefix}-` } },
    orderBy: { number: 'desc' },
    select: { number: true }
  });

  const re = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
  let max = 0;
  if (last) {
    const m = last.number.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) max = n;
    }
  }

  const next = max > 0 ? max + 1 : 1;
  await tx.company.update({
    where: { id: company.id },
    data: { nextInvoiceNumber: next },
  });
  return next;
}

export async function refreshInvoicePaymentStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice || invoice.status === "void" || invoice.status === "draft") {
    return invoice;
  }
  
  const result = await prisma.payment.aggregate({
    where: { invoiceId },
    _sum: { amount: true }
  });
  const paid = result._sum.amount || 0;
  let status = invoice.status;
  if (paid >= invoice.total - 0.5) {
    status = "paid";
  } else if (invoice.status === "paid" && paid < invoice.total - 0.5) {
    status = "issued";
  }
  if (status !== invoice.status) {
    return prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });
  }
  return invoice;
}

export type BulkDeleteResult =
  | { ok: true; count: number; numbers: string[] }
  | { error: string };

export async function executeDeleteInvoicesBulk(
  ids: string[],
  session?: SessionUser | null
): Promise<BulkDeleteResult> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: "No se seleccionó ninguna factura." };
  }

  const uniqueIds = Array.from(
    new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0))
  ).slice(0, 100);

  if (uniqueIds.length === 0) {
    return { error: "No se seleccionaron facturas válidas." };
  }

  try {
    const { deletedCount, deletedNumbers, nextNumber } =
      await prisma.$transaction(async (tx) => {
        const invoices = await tx.invoice.findMany({
          where: { id: { in: uniqueIds } },
          include: { items: true, payments: true },
        });

        if (invoices.length === 0) {
          throw new Error("No se encontraron facturas para eliminar.");
        }

        const numbers: string[] = [];

        for (const invoice of invoices) {
          numbers.push(invoice.number);

          // Si fue emitida o pagada, restaurar inventario, empaques y pagos asociados
          if (invoice.status === "issued" || invoice.status === "paid") {
            const stockMeta = {
              reason: `Eliminación ${invoice.number}`,
              refType: "invoice" as const,
              refId: invoice.id,
              refNumber: invoice.number,
              userId: session?.id || null,
              userEmail: session?.email || "",
            };
            await restoreStockForItems(tx, invoice.items, stockMeta);
            await restorePackagingForItems(tx, invoice.items, {
              reason: `Empaque eliminación ${invoice.number}`,
              refNumber: invoice.number,
              userId: session?.id || null,
              userEmail: session?.email || "",
            });

            if (invoice.payments.length > 0) {
              await tx.payment.deleteMany({ where: { invoiceId: invoice.id } });
            }
          }

          // Eliminar la factura (cascade borra items)
          await tx.invoice.delete({ where: { id: invoice.id } });
        }

        // Sincronizar correlativo de facturas
        const next = await syncNextInvoiceNumber(tx);

        return {
          deletedCount: invoices.length,
          deletedNumbers: numbers,
          nextNumber: next,
        };
      });

    if (session) {
      await writeAudit(
        session,
        "delete",
        "invoice",
        "bulk",
        `Eliminación masiva de ${deletedCount} factura(s): ${deletedNumbers.join(", ")}; contador sincronizado a ${nextNumber}`
      );
    }

    return {
      ok: true,
      count: deletedCount,
      numbers: deletedNumbers,
    };
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Error al eliminar las facturas seleccionadas.",
    };
  }
}

