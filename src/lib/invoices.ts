import { prisma } from "./prisma";

export type LineInput = {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  ivaRate: number;
};

export type ComputedLine = LineInput & {
  lineSubtotal: number;
  lineIva: number;
  lineTotal: number;
};

export function calcLine(item: LineInput) {
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

export async function allocateQuoteNumber() {
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
    const number = `${company.quotePrefix}-${String(company.nextQuoteNumber).padStart(4, "0")}`;
    await tx.company.update({
      where: { id: company.id },
      data: { nextQuoteNumber: company.nextQuoteNumber + 1 },
    });
    return number;
  });
}

export async function refreshInvoicePaymentStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice || invoice.status === "void" || invoice.status === "draft") {
    return invoice;
  }
  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
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
