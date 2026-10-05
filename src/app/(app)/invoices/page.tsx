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

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string };
}) {
  await requirePermission("invoices:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "invoices:write") : false;

  const q = searchParams?.q?.trim();
  const statusFilter = searchParams?.status?.trim();

  const whereClause: Record<string, unknown> = {};
  if (statusFilter && ["draft", "issued", "paid", "void"].includes(statusFilter)) {
    whereClause.status = statusFilter;
  }
  if (q) {
    whereClause.OR = [
      { number: { contains: q } },
      { customer: { name: { contains: q } } },
      { customer: { nit: { contains: q } } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: { customer: true, payments: true },
    take: 100,
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

      {/* Filter and Search Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form method="get" action="/invoices" className="flex flex-1 gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q || ""}
            placeholder="Buscar por número o cliente..."
            className="w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-brand-200/25 dark:text-brand-50"
          />
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark dark:bg-brand-light dark:hover:bg-brand"
          >
            Buscar
          </button>
          {q && (
            <Link
              href={statusFilter ? `/invoices?status=${statusFilter}` : "/invoices"}
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-brand-200/25 dark:text-brand-200 dark:hover:bg-brand-800"
            >
              Limpiar
            </Link>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-1 overflow-x-auto text-xs">
          {[
            { label: "Todas", val: "" },
            { label: "Borrador", val: "draft" },
            { label: "Emitidas", val: "issued" },
            { label: "Pagadas", val: "paid" },
            { label: "Anuladas", val: "void" },
          ].map((tab) => {
            const active = (statusFilter || "") === tab.val;
            const queryParam = new URLSearchParams();
            if (q) queryParam.set("q", q);
            if (tab.val) queryParam.set("status", tab.val);
            const href = queryParam.toString() ? `/invoices?${queryParam.toString()}` : "/invoices";
            return (
              <Link
                key={tab.val}
                href={href}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  active
                    ? "bg-brand text-white dark:bg-brand-light"
                    : "bg-surface text-slate-600 hover:bg-slate-100 dark:text-brand-200 dark:hover:bg-brand-800"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
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
