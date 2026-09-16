import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import { ThermalReceipt } from "@/components/thermal/receipt";
import { ThermalPrintActions } from "@/components/thermal/print-actions";

export default async function QuoteTicketPrintPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { width?: string; autoprint?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session.role, "quotes:read")) redirect("/dashboard");

  const widthMm = searchParams?.width === "58" ? 58 : 80;
  const autoPrint = searchParams?.autoprint !== "0";

  const [quote, company] = await Promise.all([
    prisma.quote.findUnique({
      where: { id: params.id },
      include: { customer: true, items: true },
    }),
    prisma.company.findFirst(),
  ]);

  if (!quote) notFound();

  return (
    <>
      <ThermalPrintActions
        backHref={`/quotes/${quote.id}`}
        autoPrint={autoPrint}
      />
      <ThermalReceipt
        title="COTIZACIÓN"
        number={quote.number}
        dateLabel="Fecha"
        dateValue={quote.createdAt}
        company={company}
        party={quote.customer}
        items={quote.items}
        subtotal={quote.subtotal}
        ivaTotal={quote.ivaTotal}
        total={quote.total}
        notes={quote.notes}
        widthMm={widthMm}
        extraLine={
          quote.validUntil
            ? `Válida hasta: ${formatDate(quote.validUntil)}`
            : null
        }
      />
    </>
  );
}
