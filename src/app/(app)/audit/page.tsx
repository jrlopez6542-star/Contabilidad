import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { bogotaDayRange, formatDateTimeBogota } from "@/lib/dates";
import { Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { Prisma } from "@prisma/client";

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: {
    entity?: string;
    action?: string;
    q?: string;
    from?: string;
    to?: string;
  };
}) {
  await requirePermission("audit:read");

  const entity = (searchParams?.entity || "").trim();
  const action = (searchParams?.action || "").trim();
  const q = (searchParams?.q || "").trim();
  const from = (searchParams?.from || "").trim();
  const to = (searchParams?.to || "").trim();

  const where: Prisma.AuditLogWhereInput = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (q) {
    where.OR = [
      { summary: { contains: q } },
      { userEmail: { contains: q } },
      { entityId: { contains: q } },
    ];
  }
  if (from || to) {
    where.createdAt = {};
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      where.createdAt.gte = bogotaDayRange(from).start;
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      where.createdAt.lt = bogotaDayRange(to).end;
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const entities = [
    "",
    "invoice",
    "product",
    "stock",
    "payment",
    "expense",
    "customer",
    "quote",
    "company",
    "user",
    "cash",
  ];
  const actions = [
    "",
    "create",
    "update",
    "delete",
    "adjust",
    "issue",
    "void",
    "convert",
    "login",
    "close",
    "reopen",
    "notify",
  ];

  return (
    <div>
      <PageHeader
        title="Auditoría"
        subtitle="Registro automático de cambios importantes (facturas, stock, usuarios, etc.)."
      />

      <Card className="mb-6">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Entidad</span>
            <select
              name="entity"
              defaultValue={entity}
              className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {entities.map((e) => (
                <option key={e || "all"} value={e}>
                  {e || "Todas"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Acción</span>
            <select
              name="action"
              defaultValue={action}
              className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {actions.map((a) => (
                <option key={a || "all"} value={a}>
                  {a || "Todas"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Desde</span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Hasta</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Buscar
            </span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="resumen o correo"
              className="w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Filtrar
            </button>
          </div>
        </form>
      </Card>

      {logs.length === 0 ? (
        <EmptyState message="No hay registros con esos filtros." />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {logs.map((log) => (
              <Card key={log.id} className="!p-3">
                <p className="text-xs text-slate-500">
                  {formatDateTimeBogota(log.createdAt)}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {log.action} · {log.entity}
                </p>
                <p className="text-sm text-slate-700">{log.summary}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {log.userEmail || "—"}
                </p>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Fecha/hora
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Acción
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Entidad
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Resumen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                      {formatDateTimeBogota(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.userEmail || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-sm">{log.entity}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {log.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Mostrando hasta 200 registros más recientes.
          </p>
        </>
      )}
    </div>
  );
}
