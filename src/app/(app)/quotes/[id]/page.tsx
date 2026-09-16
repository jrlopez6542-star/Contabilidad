import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import {
  formatCOP,
  formatDate,
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
} from "@/lib/format";
import {
  Badge,
  Card,
  LinkButton,
  PageHeader,
  Table,
} from "@/components/ui";
import { QuoteActions } from "./actions";

export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePermission("quotes:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "quotes:write") : false;

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { customer: true, items: true },
  });
  if (!quote) notFound();

  return (
    <div>
      <PageHeader
        title={`Cotización ${quote.number}`}
        subtitle={quote.customer.name}
        actions={
          <>
            <LinkButton href={`/quotes/${quote.id}/pdf`} variant="secondary" hard>
              Descargar PDF
            </LinkButton>
            <LinkButton href={`/quotes/${quote.id}/ticket`} variant="secondary" hard>
              Ticket térmico
            </LinkButton>
            <LinkButton
              href={`/quotes/${quote.id}/ticket/print`}
              variant="secondary"
              hard
            >
              Imprimir ticket
            </LinkButton>
            <LinkButton href="/quotes" variant="ghost">
              Volver
            </LinkButton>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge className={QUOTE_STATUS_COLORS[quote.status]}>
          {QUOTE_STATUS_LABELS[quote.status]}
        </Badge>
        <span className="text-sm text-slate-500">
          Creada: {formatDate(quote.createdAt)}
        </span>
        {quote.validUntil && (
          <span className="text-sm text-slate-500">
            Válida hasta: {formatDate(quote.validUntil)}
          </span>
        )}
      </div>

      {canWrite && (
        <div className="mb-6">
          <QuoteActions id={quote.id} status={quote.status} />
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-slate-500">Subtotal</p>
          <p className="text-lg font-semibold">{formatCOP(quote.subtotal)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">IVA</p>
          <p className="text-lg font-semibold">{formatCOP(quote.ivaTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-lg font-semibold text-brand">
            {formatCOP(quote.total)}
          </p>
        </Card>
      </div>

      <Table>
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Descripción</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Cant.</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Precio</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">IVA</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {quote.items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">{item.description}</td>
              <td className="px-4 py-3 text-right">{item.quantity}</td>
              <td className="px-4 py-3 text-right">{formatCOP(item.unitPrice)}</td>
              <td className="px-4 py-3 text-right">{item.ivaRate}%</td>
              <td className="px-4 py-3 text-right">{formatCOP(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {quote.notes && (
        <Card className="mt-6">
          <p className="text-sm font-medium text-slate-700">Notas</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
            {quote.notes}
          </p>
        </Card>
      )}
    </div>
  );
}
