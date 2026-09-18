import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import {
  formatCOP,
  formatDate,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/lib/format";
import {
  AlertBanner,
  Card,
  PageHeader,
  StatCard,
  Table,
  Badge,
  LinkButton,
} from "@/components/ui";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { SendStockAlertButton } from "./send-stock-alert";
import {
  getLowPackagingSupplies,
  getLowStockProducts,
} from "@/lib/stock-alerts";

export default async function DashboardPage() {
  await requirePermission("dashboard:read");
  const session = await getSession();
  const canSendStockAlert =
    session &&
    (session.role === "superadmin" ||
      session.role === "admin" ||
      session.role === "contador");
  const canWriteInvoice = session ? can(session.role, "invoices:write") : false;
  const lastSale = canWriteInvoice
    ? await prisma.invoice.findFirst({
        where: { status: { in: ["issued", "paid"] } },
        orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
        select: { id: true, number: true },
      })
    : null;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const company = await prisma.company.findFirst();
  const unpaidDays = company?.unpaidAlertDays ?? 30;
  const unpaidCutoff = new Date(now.getTime() - unpaidDays * 24 * 60 * 60 * 1000);

  const [
    issuedThisMonth,
    unpaid,
    expensesMonth,
    recentInvoices,
    customers,
    lowStockProducts,
    lowPackagingSupplies,
  ] = await Promise.all([
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
      getLowStockProducts(),
      getLowPackagingSupplies(),
    ]);
  const overdueUnpaid = unpaid.filter(
    (i) => i.issuedAt && i.issuedAt < unpaidCutoff
  );

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
        subtitle={
          canWriteInvoice
            ? "Accesos rápidos de mostrador y resumen del mes"
            : `Resumen de ${monthLabel}`
        }
      />

      {canWriteInvoice && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-brand-100">
            Mostrador
          </h2>
          <div className="flex flex-wrap items-stretch gap-3">
            <Link
              href="/mostrador"
              className="flex min-h-[5.5rem] min-w-[12rem] flex-1 touch-manipulation flex-col justify-center rounded-2xl border border-brand/15 bg-brand px-5 py-4 text-white shadow-sm transition hover:bg-brand-dark dark:bg-brand-light dark:hover:bg-brand sm:max-w-sm"
            >
              <span className="text-lg font-bold tracking-tight">Cobrar</span>
              <span className="mt-1 text-xs text-white/80">Nueva venta en mostrador</span>
            </Link>
            {lastSale ? (
              <Link
                href={`/invoices/${lastSale.id}`}
                className="flex min-h-[5.5rem] w-full touch-manipulation flex-col justify-center rounded-2xl border border-brand/15 bg-surface px-4 py-3 text-brand shadow-sm transition hover:bg-brand-50 dark:border-brand-200/25 dark:bg-brand-900 dark:text-brand-100 dark:hover:bg-brand-800 sm:w-40 sm:shrink-0"
              >
                <span className="text-sm font-semibold tracking-tight">Última venta</span>
                <span className="mt-1 truncate text-[11px] text-slate-500 dark:text-brand-200">
                  {lastSale.number} · reimprimir / anular
                </span>
              </Link>
            ) : (
              <div className="flex min-h-[5.5rem] w-full flex-col justify-center rounded-2xl border border-dashed border-brand/20 bg-surface/60 px-4 py-3 text-slate-400 sm:w-40 sm:shrink-0 dark:border-brand-200/20 dark:text-brand-300">
                <span className="text-sm font-semibold">Última venta</span>
                <span className="mt-1 text-[11px]">Aún no hay ventas</span>
              </div>
            )}
          </div>
        </section>
      )}


      {(overdueUnpaid.length > 0 ||
        lowStockProducts.length > 0 ||
        lowPackagingSupplies.length > 0) && (
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-brand-100">
            Notificaciones
          </h2>
          {overdueUnpaid.length > 0 && (
            <AlertBanner
              tone="danger"
              title={`Facturas sin pagar hace más de ${unpaidDays} días`}
            >
              <ul className="mt-1 list-inside list-disc">
                {overdueUnpaid.slice(0, 5).map((inv) => {
                  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                  return (
                    <li key={inv.id}>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="underline"
                      >
                        {inv.number}
                      </Link>{" "}
                      — {inv.customer.name} · saldo{" "}
                      {formatCOP(inv.total - paid)} · emitida{" "}
                      {formatDate(inv.issuedAt)}
                    </li>
                  );
                })}
                {overdueUnpaid.length > 5 && (
                  <li>…y {overdueUnpaid.length - 5} más</li>
                )}
              </ul>
            </AlertBanner>
          )}
          {lowStockProducts.length > 0 && (
            <Card className="border-amber-300/60 bg-amber-50/80 dark:border-gold/40 dark:bg-gold/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-gold-100">
                    Alerta de stock bajo ({lowStockProducts.length})
                  </p>
                  <p className="mt-1 text-xs text-amber-800/80 dark:text-gold-100/80">
                    Productos con seguimiento de inventario en o por debajo del
                    mínimo. Revise reposición en Productos.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-amber-950 dark:text-gold-100">
                    {lowStockProducts.slice(0, 10).map((p) => (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-amber-200/60 pb-1.5 last:border-0 dark:border-gold/20"
                      >
                        <span>
                          <Link
                            href="/products"
                            className="font-medium underline underline-offset-2"
                          >
                            {p.sku}
                          </Link>{" "}
                          — {p.name}
                        </span>
                        <span className="tabular-nums font-semibold">
                          {p.stock}{" "}
                          <span className="font-normal opacity-80">
                            (mín. {p.minStock})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {lowStockProducts.length > 10 && (
                    <p className="mt-2 text-xs text-amber-800 dark:text-gold-100/80">
                      …y {lowStockProducts.length - 10} más
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <LinkButton href="/products" variant="secondary" className="w-full sm:w-auto">
                    Ver productos
                  </LinkButton>
                  {canSendStockAlert ? <SendStockAlertButton /> : null}
                </div>
              </div>
            </Card>
          )}
          {lowPackagingSupplies.length > 0 && (
            <AlertBanner
              tone="warning"
              title={`Cajas de empaque bajas: ${lowPackagingSupplies
                .map(
                  (s) =>
                    `CAJA X${s.code === "C4" ? "4" : "10"}: ${s.quantity} (mín. ${s.minStock})`
                )
                .join(" · ")}`}
            >
              <p>Aviso: quedan 100 o menos cajas de empaque.</p>
              <Link
                href="/insumos"
                className="mt-1 inline-block font-medium underline"
              >
                Ver insumos
              </Link>
            </AlertBanner>
          )}
        </div>
      )}

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
          hint={
            salesMonth - expensesTotal >= 0
              ? "Balance positivo"
              : "Balance negativo"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-brand-100">
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
            <h2 className="text-sm font-semibold text-slate-900 dark:text-brand-100">
              Facturas recientes
            </h2>
            <Link
              href="/invoices"
              className="text-xs text-brand hover:underline"
            >
              Ver todas
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-slate-500">Sin facturas.</p>
          ) : (
            <ul className="space-y-3">
              {recentInvoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium text-brand hover:underline"
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
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-brand-100">
            Facturas por cobrar
          </h2>
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Número
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Emisión
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unpaid.map((inv) => {
                const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                return (
                  <tr key={inv.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-brand hover:underline"
                      >
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
