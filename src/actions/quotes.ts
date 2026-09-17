"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { assertPermission } from "@/lib/auth";
import { calcTotals, LineInput, syncNextQuoteNumber } from "@/lib/invoices";
import { writeAudit } from "@/lib/audit";

function parseItems(formData: FormData): LineInput[] {
  const raw = String(formData.get("itemsJson") || "[]");
  const parsed = JSON.parse(raw) as LineInput[];
  return parsed
    .map((i) => ({
      ...i,
      quantity: Math.max(1, Math.round(Number(i.quantity) || 0)),
    }))
    .filter((i) => i.description && i.quantity >= 1 && i.unitPrice >= 0);
}

async function allocateQuoteNumberInTx(
  tx: Prisma.TransactionClient
) {
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
  const number = `${company.quotePrefix}-${String(company.nextQuoteNumber).padStart(4, "0")}`;
  await tx.company.update({
    where: { id: company.id },
    data: { nextQuoteNumber: company.nextQuoteNumber + 1 },
  });
  return number;
}

export async function createQuoteAction(formData: FormData) {
  const session = await assertPermission("quotes:write");
  const customerId = String(formData.get("customerId") || "");
  const notes = String(formData.get("notes") || "").trim();
  const validUntilStr = String(formData.get("validUntil") || "");
  const status = String(formData.get("status") || "draft");
  const items = parseItems(formData);

  if (!customerId) return { error: "Seleccione un cliente." };
  if (items.length === 0) return { error: "Agregue al menos una línea." };
  if (!["draft", "sent"].includes(status)) {
    return { error: "Estado inicial inválido." };
  }

  const { items: computed, subtotal, ivaTotal, total } = calcTotals(items);

  const quote = await prisma.$transaction(async (tx) => {
    const number = await allocateQuoteNumberInTx(tx);
    return tx.quote.create({
      data: {
        number,
        customerId,
        notes,
        status,
        validUntil: validUntilStr
          ? new Date(validUntilStr + "T12:00:00")
          : null,
        subtotal,
        ivaTotal,
        total,
        items: {
          create: computed.map((i) => ({
            productId: i.productId || null,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            ivaRate: i.ivaRate,
            lineSubtotal: i.lineSubtotal,
            lineIva: i.lineIva,
            lineTotal: i.lineTotal,
          })),
        },
      },
    });
  });

  await writeAudit(session, "create", "quote", quote.id, `Creó cotización ${quote.number}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  redirect(`/quotes/${quote.id}`);
}

export async function updateQuoteAction(formData: FormData) {
  const session = await assertPermission("quotes:write");
  const id = String(formData.get("id") || "");
  const customerId = String(formData.get("customerId") || "");
  const notes = String(formData.get("notes") || "").trim();
  const validUntilStr = String(formData.get("validUntil") || "");
  const items = parseItems(formData);

  if (!id) return { error: "Cotización inválida." };
  if (!customerId) return { error: "Seleccione un cliente." };
  if (items.length === 0) return { error: "Agregue al menos una línea." };

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote || !["draft", "sent"].includes(quote.status)) {
    return { error: "Solo se pueden editar cotizaciones en borrador o enviadas." };
  }

  const { items: computed, subtotal, ivaTotal, total } = calcTotals(items);

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    await tx.quote.update({
      where: { id },
      data: {
        customerId,
        notes,
        validUntil: validUntilStr
          ? new Date(validUntilStr + "T12:00:00")
          : null,
        subtotal,
        ivaTotal,
        total,
        items: {
          create: computed.map((i) => ({
            productId: i.productId || null,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            ivaRate: i.ivaRate,
            lineSubtotal: i.lineSubtotal,
            lineIva: i.lineIva,
            lineTotal: i.lineTotal,
          })),
        },
      },
    });
  });

  await writeAudit(session, "update", "quote", id, `Actualizó cotización ${quote.number}`);
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  return { ok: true };
}

export async function setQuoteStatusAction(id: string, status: string) {
  const session = await assertPermission("quotes:write");
  const allowed = ["draft", "sent", "accepted", "rejected"];
  if (!allowed.includes(status)) return { error: "Estado inválido." };

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) return { error: "Cotización no encontrada." };
  if (quote.status === "converted") {
    return { error: "La cotización ya fue convertida." };
  }

  await prisma.quote.update({ where: { id }, data: { status } });
  await writeAudit(
    session,
    "update",
    "quote",
    id,
    `Cambió estado de ${quote.number} a ${status}`
  );
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  return { ok: true };
}

export async function deleteQuoteAction(id: string) {
  const session = await assertPermission("quotes:write");
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) {
    return { error: "Cotización no encontrada." };
  }
  if (quote.status === "converted") {
    return { error: "No se puede eliminar una cotización convertida." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    await tx.quote.delete({ where: { id } });
    await syncNextQuoteNumber(tx);
  });

  await writeAudit(
    session,
    "delete",
    "quote",
    id,
    `Eliminó cotización ${quote.number}`
  );
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Convert quote → invoice draft (does not decrease stock until issued). */
export async function convertQuoteToInvoiceAction(id: string) {
  const session = await assertPermission("quotes:write");
  await assertPermission("invoices:write");

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!quote) return { error: "Cotización no encontrada." };
  if (quote.status === "converted") {
    return { error: "Ya fue convertida." };
  }
  if (quote.status === "rejected") {
    return { error: "No se puede convertir una cotización rechazada." };
  }

  const invoice = await prisma.$transaction(async (tx) => {
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

    const inv = await tx.invoice.create({
      data: {
        number,
        customerId: quote.customerId,
        notes: quote.notes
          ? `${quote.notes}\n(Desde cotización ${quote.number})`
          : `Desde cotización ${quote.number}`,
        quoteId: quote.id,
        status: "draft",
        subtotal: quote.subtotal,
        ivaTotal: quote.ivaTotal,
        total: quote.total,
        items: {
          create: quote.items.map((i) => ({
            productId: i.productId,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            ivaRate: i.ivaRate,
            lineSubtotal: i.lineSubtotal,
            lineIva: i.lineIva,
            lineTotal: i.lineTotal,
          })),
        },
      },
    });

    await tx.quote.update({
      where: { id: quote.id },
      data: { status: "converted" },
    });

    return inv;
  });

  await writeAudit(
    session,
    "convert",
    "quote",
    id,
    `Convertó ${quote.number} → factura borrador ${invoice.number}`
  );
  revalidatePath("/quotes");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices/${invoice.id}`);
}
