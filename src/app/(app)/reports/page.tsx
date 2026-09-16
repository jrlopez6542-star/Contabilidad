import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { formatCOP, formatDate } from "@/lib/format";
import { Card, EmptyState, LinkButton, PageHeader, Table } from "@/components/ui";

function parseDate(v: string | undefined, fallback: Date) {
  if (!v) return fallback;
  const d = new Date(v + "T00:00:00");
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  await requirePermission("reports:read");
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const from = parseDate(searchParams.from, defaultFrom);
  const to = parseDate(searchParams.to, defaultTo);
  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  const qs = `from=${fromStr}&to=${toStr}`;

  const [invoices, expenses, unpaid] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        status: { in: ["issued", "paid"] },
        issuedAt: { gte: from, lte: toEnd },
      },
      include: { customer: true },
      orderBy: { issuedAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: toEnd } },
      orderBy: { date: "asc" },
    }),
    prisma.invoice.findMany({
      where: { status: "issued" },
      include: { customer: true, payments: true },
      orderBy: { issuedAt: "asc" },
    }),
  ]);

  const salesTotal = invoices.reduce((s, i) => s + i.total, 0);
  const ivaCollected = invoices.reduce((s, i) => s + i.ivaTotal, 0);
  const expensesByCat = new Map<string, number>();
  for (const e of expenses) {
    expensesByCat.set(e.category, (expensesByCat.get(e.category) || 0) + e.amount);
  }
  const arRows = unpaid.map((inv) => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    return {
      ...inv,
      balance: Math.max(0, inv.total - paid),
    };
  });
  const arTotal = arRows.reduce((s, r) => s + r.balance, 0);

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle="Ventas, IVA, cuentas por cobrar y gastos"
      />

      <Card className="mb-6">
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Desde</span>
            <input
              type="date"
              name="from"
              defaultValue={fromStr}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Hasta</span>
            <input
              type="date"
              name="to"
              defaultValue={toStr}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Filtrar
          </button>
        </form>
      </Card>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">Ventas del período</p>
          <p className="mt-1 text-xl font-bold">{formatCOP(salesTotal)}</p>
          <p className="text-xs text-slate-400">{invoices.length} facturas</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">IVA estimado</p>
          <p className="mt-1 text-xl font-bold">{formatCOP(ivaCollected)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Cuentas por cobrar</p>
          <p className="mt-1 text-xl font-bold">{formatCOP(arTotal)}</p>
          <p className="text-xs text-slate-400">{arRows.length} pendientes</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Gastos del período</p>
          <p className="mt-1 text-xl font-bold">
            {formatCOP(expenses.reduce((s, e) => s + e.amount, 0))}
          </p>
        </Card>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Ventas por período</h2>
          <LinkButton
            href={`/reports/csv/sales?${qs}`}
            variant="secondary"
            className="text-xs"
            hard
          >
            Exportar CSV
          </LinkButton>
        </div>
        {invoices.length === 0 ? (
          <EmptyState message="Sin ventas en el período seleccionado." />
        ) : (
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Factura</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Subtotal</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">IVA</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3">{inv.number}</td>
                  <td className="px-4 py-3">{inv.customer.name}</td>
                  <td className="px-4 py-3">{formatDate(inv.issuedAt)}</td>
                  <td className="px-4 py-3 text-right">{formatCOP(inv.subtotal)}</td>
                  <td className="px-4 py-3 text-right">{formatCOP(inv.ivaTotal)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCOP(inv.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">IVA estimado</h2>
          <LinkButton
            href={`/reports/csv/iva?${qs}`}
            variant="secondary"
            className="text-xs"
            hard
          >
            Exportar CSV
          </LinkButton>
        </div>
        <Card>
          <p className="text-sm text-slate-600">
            IVA estimado en facturas emitidas/pagadas del período:{" "}
            <strong>{formatCOP(ivaCollected)}</strong>
          </p>
        </Card>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Cuentas por cobrar</h2>
          <LinkButton
            href="/reports/csv/receivable"
            variant="secondary"
            className="text-xs"
            hard
          >
            Exportar CSV
          </LinkButton>
        </div>
        {arRows.length === 0 ? (
          <EmptyState message="No hay cuentas por cobrar pendientes." />
        ) : (
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Factura</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Emisión</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Total</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {arRows.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3">{inv.number}</td>
                  <td className="px-4 py-3">{inv.customer.name}</td>
                  <td className="px-4 py-3">{formatDate(inv.issuedAt)}</td>
                  <td className="px-4 py-3 text-right">{formatCOP(inv.total)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCOP(inv.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Gastos por categoría</h2>
          <LinkButton
            href={`/reports/csv/expenses?${qs}`}
            variant="secondary"
            className="text-xs"
            hard
          >
            Exportar CSV
          </LinkButton>
        </div>
        {expensesByCat.size === 0 ? (
          <EmptyState message="Sin gastos registrados en el período." />
        ) : (
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Categoría
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from(expensesByCat.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([cat, total]) => (
                  <tr key={cat}>
                    <td className="px-4 py-3">{cat}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCOP(total)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
