import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { formatCOP, formatDate, INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from "@/lib/format";
import { Card, PageHeader, StatCard, Table, Badge, LinkButton } from "@/components/ui";
import Link from "next/link";

export default async function DashboardPage() {
  await requirePermission("dashboard:read");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [issuedThisMonth, unpaid, expensesMonth, recentInvoices, customers] =
    await Promise.all([
      prisma.invoice.findMany({
        where: {
          status: { in: ["issued", "paid"] },
          issuedAt: { gte: monthStart, lt: monthEnd },
        },
      }),
      prisma.invoice.findMany({
        where: { status: "issued" },
        include: { customer: true, payments: true },
        orderBy: { issuedAt: "asc" },
      }),
      prisma.expense.findMany({
        where: { date: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { customer: true },
      }),
      prisma.customer.findMany({
        include: {
          invoices: {
            where: { status: { in: ["issued", "paid"] } },
          },
        },
      }),
    ]);

  const salesMonth = issuedThisMonth.reduce((s, i) => s + i.total, 0);
  const expensesTotal = expensesMonth.reduce((s, e) => s + e.amount, 0);
  const unpaidTotal = unpaid.reduce((s, i) => {
    const paid = i.payments.reduce((p, x) => p + x.amount, 0);
    return s + Math.max(0, i.total - paid);
  }, 0);

  const topCustomers = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      total: c.invoices.reduce((s, i) => s + i.total, 0),
      count: c.invoices.length,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const monthLabel = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <div>
      <PageHeader
        title="Panel"
        subtitle={`Resumen de ${monthLabel}`}
        actions={<LinkButton href="/invoices/new">Nueva factura</LinkButton>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ventas del mes"
          value={formatCOP(salesMonth)}
          hint={`${issuedThisMonth.length} factura(s) emitidas/pagadas`}
        />
        <StatCard
          label="Por cobrar"
          value={formatCOP(unpaidTotal)}
          hint={`${unpaid.length} factura(s) pendientes`}
        />
        <StatCard
          label="Gastos del mes"
          value={formatCOP(expensesTotal)}
          hint={`${expensesMonth.length} registro(s)`}
        />
        <StatCard
          label="Ingresos vs gastos"
          value={formatCOP(salesMonth - expensesTotal)}
          hint={salesMonth - expensesTotal >= 0 ? "Balance positivo" : "Balance negativo"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Top clientes (histórico)
          </h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-slate-500">Sin ventas aún.</p>
          ) : (
            <ul className="space-y-3">
              {topCustomers.map((c, idx) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-slate-800">
                    {idx + 1}. {c.name}
                  </span>
                  <span className="text-slate-600">{formatCOP(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Facturas recientes
            </h2>
            <Link href="/invoices" className="text-xs text-emerald-700 hover:underline">
              Ver todas
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-slate-500">Sin facturas.</p>
          ) : (
            <ul className="space-y-3">
              {recentInvoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between text-sm">
                  <div>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {inv.number}
                    </Link>
                    <p className="text-xs text-slate-500">{inv.customer.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCOP(inv.total)}</p>
                    <Badge className={INVOICE_STATUS_COLORS[inv.status]}>
                      {INVOICE_STATUS_LABELS[inv.status]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {unpaid.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Facturas por cobrar
          </h2>
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Número</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Emisión</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unpaid.map((inv) => {
                const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                return (
                  <tr key={inv.id}>
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="text-emerald-700 hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{inv.customer.name}</td>
                    <td className="px-4 py-3">{formatDate(inv.issuedAt)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCOP(inv.total - paid)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
