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
            <LinkButton href="/invoices/new">Nueva factura</LinkButton>
          ) : undefined
        }
      />
      {invoices.length === 0 ? (
        <EmptyState message="No hay facturas. Cree la primera." />
      ) : (
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Número</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => {
              const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
              const balance =
                inv.status === "void" ? 0 : Math.max(0, inv.total - paid);
              return (
                <tr key={inv.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{inv.customer.name}</td>
                  <td className="px-4 py-3">
                    {formatDate(inv.issuedAt || inv.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={INVOICE_STATUS_COLORS[inv.status]}>
                      {INVOICE_STATUS_LABELS[inv.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{formatCOP(inv.total)}</td>
                  <td className="px-4 py-3 text-right">{formatCOP(balance)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
