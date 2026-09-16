import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { formatCOP, formatDate, PAYMENT_METHODS } from "@/lib/format";
import { Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { PaymentPageForm } from "./form";

export default async function PaymentsPage() {
  await requirePermission("payments:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "payments:write") : false;

  const [payments, openInvoices] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      include: {
        invoice: { include: { customer: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["issued", "paid"] } },
      include: { customer: true, payments: true },
      orderBy: { number: "desc" },
    }),
  ]);

  const invoicesWithBalance = openInvoices
    .map((inv) => {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      const balance = Math.max(0, inv.total - paid);
      return { ...inv, balance };
    })
    .filter((inv) => inv.balance > 0);

  return (
    <div>
      <PageHeader
        title="Pagos"
        subtitle="Registro de cobros contra facturas emitidas"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {canWrite && (
          <Card className="h-fit lg:col-span-1">
            <h2 className="mb-4 text-sm font-semibold">Nuevo pago</h2>
            {invoicesWithBalance.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay facturas con saldo pendiente.
              </p>
            ) : (
              <PaymentPageForm
                invoices={invoicesWithBalance.map((i) => ({
                  id: i.id,
                  label: `${i.number} — ${i.customer.name} (saldo ${formatCOP(i.balance)})`,
                  balance: i.balance,
                }))}
                methods={PAYMENT_METHODS}
              />
            )}
          </Card>
        )}
        <div className={canWrite ? "lg:col-span-2" : "lg:col-span-3"}>
          {payments.length === 0 ? (
            <EmptyState message="Aún no hay pagos registrados." />
          ) : (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Factura
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Método
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">{formatDate(p.paidAt)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${p.invoiceId}`}
                        className="text-brand hover:underline"
                      >
                        {p.invoice.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{p.invoice.customer.name}</td>
                    <td className="px-4 py-3">
                      {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ||
                        p.method}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCOP(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
