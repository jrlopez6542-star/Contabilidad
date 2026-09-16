"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";
import { allocateInvoiceNumber, calcTotals, LineInput } from "@/lib/invoices";

function parseItems(formData: FormData): LineInput[] {
  const raw = String(formData.get("itemsJson") || "[]");
  const parsed = JSON.parse(raw) as LineInput[];
  return parsed.filter(
    (i) => i.description && i.quantity > 0 && i.unitPrice >= 0
  );
}

export async function createInvoiceAction(formData: FormData) {
  await assertPermission("invoices:write");
  const customerId = String(formData.get("customerId") || "");
  const notes = String(formData.get("notes") || "").trim();
  const issueNow = formData.get("issueNow") === "true";
  const items = parseItems(formData);

  if (!customerId) return { error: "Seleccione un cliente." };
  if (items.length === 0) return { error: "Agregue al menos una línea." };

  const { items: computed, subtotal, ivaTotal, total } = calcTotals(items);
  const number = await allocateInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      number,
      customerId,
      notes,
      status: issueNow ? "issued" : "draft",
      issuedAt: issueNow ? new Date() : null,
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

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices/${invoice.id}`);
}

export async function issueInvoiceAction(id: string) {
  await assertPermission("invoices:write");
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.status !== "draft") {
    return { error: "Solo se pueden emitir borradores." };
  }
  await prisma.invoice.update({
    where: { id },
    data: { status: "issued", issuedAt: new Date() },
  });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function voidInvoiceAction(id: string) {
  await assertPermission("invoices:write");
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.status === "void") {
    return { error: "Factura no válida para anular." };
  }
  if (invoice.status === "paid") {
    return { error: "No se puede anular una factura pagada." };
  }
  await prisma.invoice.update({
    where: { id },
    data: { status: "void" },
  });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { ok: true };
}
