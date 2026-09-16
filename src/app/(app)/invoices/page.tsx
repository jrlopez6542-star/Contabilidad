import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import {
  formatCOP,
  formatDate,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/lib/format";
import { Badge, EmptyState, LinkButton, PageHeader, Table } from "@/components/ui";
import { InvoiceRowActions } from "./row-actions";

export default async function InvoicesPage() {
  await requirePermission("invoices:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "invoices:write") : false;
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, payments: true },
  });

  return (
    <div>
      <PageHeader
        title="Facturas"
        subtitle="Numeración secuencial interna (sin DIAN electrónica)"
        actions={
          canWrite ? (
            <LinkButton href="/invoices/new" className="w-full sm:w-auto">
              Nueva factura
            </LinkButton>
          ) : undefined
        }
      />
      {invoices.length === 0 ? (
        <EmptyState
          message="Aún no hay facturas. Cree la primera para comenzar a vender."
          action={
            canWrite ? (
              <LinkButton href="/invoices/new">Nueva factura</LinkButton>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-slate-600 sm:px-4">
                Número
              </th>
              <th className="px-3 py-3 text-left font-medium text-slate-600 sm:px-4">
                Cliente
              </th>
              <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-slate-600 sm:px-4">
                Fecha
              </th>
              <th className="px-3 py-3 text-left font-medium text-slate-600 sm:px-4">
                Estado
              </th>
              <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-600 sm:px-4">
                Total
              </th>
              <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-600 sm:px-4">
                Saldo
              </th>
              {canWrite && (
                <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-slate-600 sm:px-4">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => {
              const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
              const balance =
                inv.status === "void" ? 0 : Math.max(0, inv.total - paid);
              return (
                <tr key={inv.id}>
                  <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-3 sm:max-w-none sm:px-4">
                    {inv.customer.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                    {formatDate(inv.issuedAt || inv.createdAt)}
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <Badge className={INVOICE_STATUS_COLORS[inv.status]}>
                      {INVOICE_STATUS_LABELS[inv.status]}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right sm:px-4">
                    {formatCOP(inv.total)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right sm:px-4">
                    {formatCOP(balance)}
                  </td>
                  {canWrite && (
                    <td className="px-3 py-3 text-right sm:px-4">
                      <InvoiceRowActions
                        id={inv.id}
                        status={inv.status}
                        number={inv.number}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
