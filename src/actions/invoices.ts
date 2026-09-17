"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { assertPermission } from "@/lib/auth";
import { calcTotals, LineInput, syncNextInvoiceNumber } from "@/lib/invoices";
import { decreaseStockForItems, restoreStockForItems } from "@/lib/inventory";
import {
  decreasePackagingForItems,
  restorePackagingForItems,
} from "@/lib/packaging";
import type { PackagingCrossEvent } from "@/lib/packaging";
import { writeAudit } from "@/lib/audit";
import { notifyPackagingLow, notifyStockCrossings } from "@/lib/stock-alerts";
import type { StockCrossEvent } from "@/lib/stock-alerts";

const SALE_METHODS = new Set(["efectivo", "transferencia"]);

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

function normalizePaymentMethod(raw: string): string {
  const m = raw.trim().toLowerCase();
  return SALE_METHODS.has(m) ? m : "";
}

export async function createInvoiceAction(formData: FormData) {
  const session = await assertPermission("invoices:write");
  let customerId = String(formData.get("customerId") || "").trim();
  const cedula = String(formData.get("cedula") || "").trim();
  const customerName = String(formData.get("customerName") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const issueNow = formData.get("issueNow") === "true";
  const markPaid = formData.get("markPaid") === "true";
  const quoteId = String(formData.get("quoteId") || "") || null;
  const paymentMethod = normalizePaymentMethod(
    String(formData.get("paymentMethod") || "")
  );
  const items = parseItems(formData);

  if (!customerId && !cedula) {
    return { error: "Ingrese la cédula/NIT del cliente." };
  }
  if (items.length === 0) return { error: "Agregue al menos una línea." };
  if (issueNow && !paymentMethod) {
    return { error: "Seleccione método de pago (Efectivo o Transferencia)." };
  }

  const { items: computed, subtotal, ivaTotal, total } = calcTotals(items);

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      if (!customerId && cedula) {
        const existing = await tx.customer.findFirst({
          where: { nit: cedula },
        });
        if (existing) {
          customerId = existing.id;
        } else {
          const created = await tx.customer.create({
            data: {
              nit: cedula,
              name: customerName || `Cliente ${cedula}`,
              email: "",
              phone: "",
              address: "",
            },
          });
          customerId = created.id;
        }
      }

      const number = await allocateInvoiceNumberInTx(tx);
      const created = await tx.invoice.create({
        data: {
          number,
          customerId,
          notes,
          quoteId,
          paymentMethod,
          status: issueNow ? (markPaid ? "paid" : "issued") : "draft",
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

      let stockCrossings: StockCrossEvent[] = [];
      let packagingChanged = false;
      let packagingCrossings: PackagingCrossEvent[] = [];
      if (issueNow) {
        const stockMeta = {
          reason: `Venta ${number}`,
          refType: "invoice" as const,
          refId: created.id,
          refNumber: number,
          userId: session.id,
          userEmail: session.email,
        };
        stockCrossings = await decreaseStockForItems(tx, computed, stockMeta);
        const packaging = await decreasePackagingForItems(tx, computed, {
          reason: `Empaque venta ${number}`,
          refNumber: number,
          userId: session.id,
          userEmail: session.email,
        });
        packagingChanged = packaging.changed;
        packagingCrossings = packaging.crossed;
      }

      if (issueNow && markPaid && paymentMethod && total > 0) {
        await tx.payment.create({
          data: {
            invoiceId: created.id,
            amount: total,
            method: paymentMethod,
            paidAt: new Date(),
            notes: "",
          },
        });
      }

      return { created, stockCrossings, packagingChanged, packagingCrossings };
    });

    // Soft-fail stock alerts after commit.
    try {
      await notifyStockCrossings(invoice.stockCrossings || []);
    } catch (e) {
      console.error("[stock-alerts] createInvoice product hook failed", e);
    }
    try {
      if (invoice.packagingCrossings.length > 0) {
        await notifyPackagingLow(invoice.packagingCrossings);
      }
    } catch (e) {
      console.error("[stock-alerts] createInvoice packaging hook failed", e);
    }

    await writeAudit(
      session,
      issueNow ? "issue" : "create",
      "invoice",
      invoice.created.id,
      `${issueNow ? "Emitió" : "Creó"} factura ${invoice.created.number}${
        paymentMethod ? ` (${paymentMethod})` : ""
      }`
    );

    revalidatePath("/invoices");
    revalidatePath("/products");
    revalidatePath("/customers");
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    if (invoice.packagingChanged) revalidatePath("/insumos");
    if (issueNow) {
      redirect(`/invoices/${invoice.created.id}/ticket/print?next=/mostrador`);
    }
    redirect(`/invoices/${invoice.created.id}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo crear la factura.";
    if (msg.includes("NEXT_REDIRECT")) throw e;
    return { error: msg };
  }
}

async function allocateInvoiceNumberInTx(tx: Prisma.TransactionClient) {
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
}

export async function updateDraftInvoiceAction(formData: FormData) {
  const session = await assertPermission("invoices:write");
  const id = String(formData.get("id") || "");
  const customerId = String(formData.get("customerId") || "");
  const notes = String(formData.get("notes") || "").trim();
  const paymentMethod = normalizePaymentMethod(
    String(formData.get("paymentMethod") || "")
  );
  const items = parseItems(formData);

  if (!id) return { error: "Factura inválida." };
  if (!customerId) return { error: "Seleccione un cliente." };
  if (items.length === 0) return { error: "Agregue al menos una línea." };

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.status !== "draft") {
    return { error: "Solo se pueden editar borradores." };
  }

  const { items: computed, subtotal, ivaTotal, total } = calcTotals(items);

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.update({
      where: { id },
      data: {
        customerId,
        notes,
        paymentMethod,
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

  await writeAudit(session, "update", "invoice", id, `Actualizó borrador ${invoice.number}`);
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteDraftInvoiceAction(id: string) {
  const session = await assertPermission("invoices:write");
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.status !== "draft") {
    return { error: "Solo se pueden eliminar borradores." };
  }
  // Drafts never deduct stock — hard delete is safe (cascade removes items).
  const next = await prisma.$transaction(async (tx) => {
    await tx.invoice.delete({ where: { id } });
    return syncNextInvoiceNumber(tx);
  });
  await writeAudit(
    session,
    "delete",
    "invoice",
    id,
    `Eliminó borrador ${invoice.number}; contador sincronizado a ${next}`
  );
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/company");
  redirect("/invoices");
}

export async function deleteVoidInvoiceAction(id: string) {
  const session = await assertPermission("invoices:write");
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.status !== "void") {
    return { error: "Solo se pueden eliminar facturas anuladas." };
  }
  // Void already restored stock and cleared payments — hard delete + sync counter.
  const next = await prisma.$transaction(async (tx) => {
    await tx.invoice.delete({ where: { id } });
    return syncNextInvoiceNumber(tx);
  });
  await writeAudit(
    session,
    "delete",
    "invoice",
    id,
    `Eliminó factura anulada ${invoice.number}; contador sincronizado a ${next}`
  );
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/company");
  redirect("/invoices");
}

export async function issueInvoiceAction(
  id: string,
  opts?: { paymentMethod?: string; markPaid?: boolean }
) {
  const session = await assertPermission("invoices:write");
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!invoice || invoice.status !== "draft") {
    return { error: "Solo se pueden emitir borradores." };
  }

  const paymentMethod =
    normalizePaymentMethod(opts?.paymentMethod || invoice.paymentMethod || "") ||
    invoice.paymentMethod ||
    "";
  const markPaid = opts?.markPaid !== false && !!paymentMethod;

  if (!paymentMethod) {
    return { error: "Seleccione método de pago (Efectivo o Transferencia)." };
  }

  let stockCrossings: StockCrossEvent[] = [];
  let packagingChanged = false;
  let packagingCrossings: PackagingCrossEvent[] = [];
  try {
    const result = await prisma.$transaction(async (tx) => {
      const stockMeta = {
        reason: `Venta ${invoice.number}`,
        refType: "invoice" as const,
        refId: invoice.id,
        refNumber: invoice.number,
        userId: session.id,
        userEmail: session.email,
      };
      const crossings = await decreaseStockForItems(tx, invoice.items, stockMeta);
      const packaging = await decreasePackagingForItems(tx, invoice.items, {
        reason: `Empaque venta ${invoice.number}`,
        refNumber: invoice.number,
        userId: session.id,
        userEmail: session.email,
      });
      await tx.invoice.update({
        where: { id },
        data: {
          status: markPaid ? "paid" : "issued",
          issuedAt: new Date(),
          paymentMethod,
        },
      });
      if (markPaid && invoice.total > 0) {
        await tx.payment.create({
          data: {
            invoiceId: id,
            amount: invoice.total,
            method: paymentMethod,
            paidAt: new Date(),
            notes: "",
          },
        });
      }
      return { crossings, packaging };
    });
    stockCrossings = result.crossings;
    packagingChanged = result.packaging.changed;
    packagingCrossings = result.packaging.crossed;
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo emitir la factura.",
    };
  }
  try {
    await notifyStockCrossings(stockCrossings || []);
  } catch (e) {
    console.error("[stock-alerts] issueInvoice product hook failed", e);
  }
  try {
    if (packagingCrossings.length > 0) {
      await notifyPackagingLow(packagingCrossings);
    }
  } catch (e) {
    console.error("[stock-alerts] issueInvoice packaging hook failed", e);
  }
  await writeAudit(
    session,
    "issue",
    "invoice",
    id,
    `Emitió factura ${invoice.number} (${paymentMethod})`
  );
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/products");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  if (packagingChanged) revalidatePath("/insumos");
  return { ok: true };
}

export async function voidInvoiceAction(id: string) {
  const session = await assertPermission("invoices:write");
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, payments: true },
  });
  if (!invoice || invoice.status === "void") {
    return { error: "Factura no válida para anular." };
  }
  // Drafts: use delete. Anular is for emitted (issued/paid) invoices.
  if (invoice.status === "draft") {
    return {
      error:
        "Los borradores no se anulan: elimínelos o edítelos desde el detalle.",
    };
  }
  if (invoice.status !== "issued" && invoice.status !== "paid") {
    return { error: "Factura no válida para anular." };
  }

  // issued and paid both deducted stock/packaging on emit — restore them.
  const packagingChanged = await prisma.$transaction(async (tx) => {
    const stockMeta = {
      reason: `Anulación ${invoice.number}`,
      refType: "invoice" as const,
      refId: invoice.id,
      refNumber: invoice.number,
      userId: session.id,
      userEmail: session.email,
    };
    await restoreStockForItems(tx, invoice.items, stockMeta);
    const packaging = await restorePackagingForItems(tx, invoice.items, {
      reason: `Empaque anulación ${invoice.number}`,
      refNumber: invoice.number,
      userId: session.id,
      userEmail: session.email,
    });
    // Reverse payment status: remove payments so the voided invoice has no paid amounts
    if (invoice.payments.length > 0) {
      await tx.payment.deleteMany({ where: { invoiceId: id } });
    }
    await tx.invoice.update({
      where: { id },
      data: { status: "void" },
    });
    return packaging;
  });
  await writeAudit(
    session,
    "void",
    "invoice",
    id,
    `Anuló factura ${invoice.number}${
      invoice.status === "paid" ? " (pagada; stock y pagos revertidos)" : " (stock revertido)"
    }`
  );
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/products");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  if (packagingChanged) revalidatePath("/insumos");
  return { ok: true };
}

/** Lookup customer by cédula/NIT; create minimal record if missing. */
export async function findOrCreateCustomerByCedulaAction(formData: FormData) {
  await assertPermission("invoices:write");
  const cedula = String(formData.get("cedula") || "").trim();
  const name = String(formData.get("name") || "").trim();
  if (!cedula) return { error: "Ingrese la cédula o NIT." };

  const existing = await prisma.customer.findFirst({ where: { nit: cedula } });
  if (existing) {
    return {
      ok: true as const,
      created: false,
      customer: {
        id: existing.id,
        name: existing.name,
        nit: existing.nit,
      },
    };
  }

  // Creating requires customers:write — vendedor has it
  await assertPermission("customers:write");
  const customer = await prisma.customer.create({
    data: {
      nit: cedula,
      name: name || `Cliente ${cedula}`,
    },
  });
  revalidatePath("/customers");
  return {
    ok: true as const,
    created: true,
    customer: { id: customer.id, name: customer.name, nit: customer.nit },
  };
}
