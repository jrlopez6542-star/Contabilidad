import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { LinkButton, PageHeader } from "@/components/ui";
import { InvoiceList } from "./invoice-list";

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
      <InvoiceList invoices={invoices} canWrite={canWrite} />
    </div>
  );
}
