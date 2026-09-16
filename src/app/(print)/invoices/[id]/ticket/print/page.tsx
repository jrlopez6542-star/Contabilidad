import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { ThermalReceipt } from "@/components/thermal/receipt";
import { ThermalPrintActions } from "@/components/thermal/print-actions";

export default async function InvoiceTicketPrintPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { width?: string; autoprint?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "invoices:read")) redirect("/dashboard");

  const widthMm = searchParams?.width === "58" ? 58 : 80;
  const autoPrint = searchParams?.autoprint !== "0";

  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: params.id },
      include: { customer: true, items: true, payments: true },
    }),
    prisma.company.findFirst(),
  ]);

  if (!invoice) notFound();

  const paymentMethod =
    invoice.paymentMethod || invoice.payments[0]?.method || null;

  return (
    <>
      <ThermalPrintActions
        backHref={`/invoices/${invoice.id}`}
        autoPrint={autoPrint}
      />
      <ThermalReceipt
        title="FACTURA DE VENTA"
        number={invoice.number}
        dateLabel="Fecha"
        dateValue={invoice.issuedAt || invoice.createdAt}
        company={company}
        party={invoice.customer}
        items={invoice.items}
        subtotal={invoice.subtotal}
        ivaTotal={invoice.ivaTotal}
        total={invoice.total}
        notes={invoice.notes}
        paymentMethod={paymentMethod}
        widthMm={widthMm}
      />
    </>
  );
}
