import Link from "next/link";
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
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
} from "@/components/ui";

export default async function QuotesPage() {
  await requirePermission("quotes:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "quotes:write") : false;
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        subtitle="Propuestas comerciales · convertir a factura borrador"
        actions={
          canWrite ? (
            <LinkButton href="/quotes/new">Nueva cotización</LinkButton>
          ) : undefined
        }
      />
      {quotes.length === 0 ? (
        <EmptyState
          message="Aún no hay cotizaciones."
          action={
            canWrite ? (
              <LinkButton href="/quotes/new">Crear cotización</LinkButton>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Número</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotes.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/quotes/${q.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {q.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{q.customer.name}</td>
                <td className="px-4 py-3">{formatDate(q.createdAt)}</td>
                <td className="px-4 py-3">
                  <Badge className={QUOTE_STATUS_COLORS[q.status]}>
                    {QUOTE_STATUS_LABELS[q.status] || q.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCOP(q.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
