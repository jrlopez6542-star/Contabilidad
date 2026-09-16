"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/auth";
import { refreshInvoicePaymentStatus } from "@/lib/invoices";
import { writeAudit } from "@/lib/audit";

export async function createPaymentAction(formData: FormData) {
  const session = await assertPermission("payments:write");
  const invoiceId = String(formData.get("invoiceId") || "");
  const amount = Number(formData.get("amount") || 0);
  const method = String(formData.get("method") || "transferencia");
  const paidAt = String(formData.get("paidAt") || "");
  const notes = String(formData.get("notes") || "").trim();

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) return { error: "Factura no encontrada." };
  if (invoice.status === "void" || invoice.status === "draft") {
    return { error: "Solo se pueden registrar pagos en facturas emitidas." };
  }
  if (amount <= 0) return { error: "El monto debe ser mayor a 0." };

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount,
      method,
      paidAt: paidAt ? new Date(paidAt + "T12:00:00") : new Date(),
      notes,
    },
  });
  await refreshInvoicePaymentStatus(invoiceId);
  await writeAudit(
    session,
    "create",
    "payment",
    payment.id,
    `Registró pago ${amount} en ${invoice.number}`
  );
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { ok: true };
}
