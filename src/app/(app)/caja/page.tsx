import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { bogotaDateString, formatDateTimeBogota } from "@/lib/dates";
import { getDayBreakdown } from "@/lib/cash";
import { formatCOP } from "@/lib/format";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  Table,
} from "@/components/ui";
import { CajaCloseForm } from "./close-form";
import { CajaReopenButton } from "./reopen-button";

export default async function CajaPage({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  await requirePermission("cash:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "cash:write") : false;
  const canReopen =
    session?.role === "superadmin" || session?.role === "admin";

  const dateStr =
    searchParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : bogotaDateString();

  const [breakdown, closeRecord, history] = await Promise.all([
    getDayBreakdown(dateStr),
    prisma.cashClose.findUnique({ where: { date: dateStr } }),
    prisma.cashClose.findMany({
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  const isClosed = closeRecord?.status === "closed";

  return (
    <div>
      <PageHeader
        title="Caja del día"
        subtitle={`Totales por método de pago (America/Bogotá) · ${dateStr}`}
        actions={
          <form method="get" action="/caja" className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Fecha</span>
              <input
                type="date"
                name="date"
                defaultValue={dateStr}
                className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-lg border border-brand/20 bg-white px-4 py-2 text-sm font-medium text-brand hover:bg-brand-50"
            >
              Ver día
            </button>
          </form>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Efectivo cobrado" value={formatCOP(breakdown.efectivo)} />
        <StatCard
          label="Transferencia"
          value={formatCOP(breakdown.transferencia)}
        />
        <StatCard label="Tarjeta" value={formatCOP(breakdown.tarjeta)} />
        <StatCard label="Otro" value={formatCOP(breakdown.otro)} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Gastos del día"
          value={formatCOP(breakdown.expensesTotal)}
          hint={`Detectados como efectivo: ${formatCOP(breakdown.cashExpenses)}`}
        />
        <StatCard
          label="Efectivo esperado"
          value={formatCOP(breakdown.expectedCash)}
          hint="Efectivo cobrado − gastos en efectivo"
        />
        {isClosed && closeRecord ? (
          <StatCard
            label="Diferencia (cierre)"
            value={formatCOP(closeRecord.difference)}
            hint={`Contado ${formatCOP(closeRecord.countedCash)}`}
          />
        ) : (
          <StatCard
            label="Estado"
            value="Abierta"
            hint="Aún no se ha cerrado la caja de este día"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit lg:col-span-1">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            {isClosed ? "Cierre del día" : "Cerrar caja"}
          </h2>
          {isClosed && closeRecord ? (
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                Contado:{" "}
                <strong>{formatCOP(closeRecord.countedCash)}</strong>
              </p>
              <p>
                Esperado:{" "}
                <strong>{formatCOP(closeRecord.expectedCash)}</strong>
              </p>
              <p>
                Diferencia:{" "}
                <strong
                  className={
                    closeRecord.difference === 0
                      ? "text-brand"
                      : "text-jam"
                  }
                >
                  {formatCOP(closeRecord.difference)}
                </strong>
              </p>
              <p className="text-xs text-slate-500">
                Cerrado por {closeRecord.closedByEmail || "—"} ·{" "}
                {formatDateTimeBogota(closeRecord.updatedAt)}
              </p>
              {closeRecord.notes ? (
                <p className="rounded-lg bg-cream-muted p-2 text-xs">
                  {closeRecord.notes}
                </p>
              ) : null}
              {canReopen && canWrite && (
                <CajaReopenButton date={dateStr} />
              )}
            </div>
          ) : canWrite ? (
            <CajaCloseForm
              date={dateStr}
              expectedCash={breakdown.expectedCash}
            />
          ) : (
            <p className="text-sm text-slate-500">
              Solo admin o contador pueden cerrar la caja.
            </p>
          )}
        </Card>

        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Historial de cierres
          </h2>
          {history.length === 0 ? (
            <EmptyState message="Aún no hay cierres de caja." />
          ) : (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Esperado
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Contado
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Diff
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Por
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-3">
                      <a
                        href={`/caja?date=${h.date}`}
                        className="text-brand hover:underline"
                      >
                        {h.date}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCOP(h.expectedCash)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCOP(h.countedCash)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCOP(h.difference)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          h.status === "closed"
                            ? "bg-brand-100 text-brand"
                            : "bg-gold-100 text-amber-900"
                        }
                      >
                        {h.status === "closed" ? "Cerrada" : "Abierta"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {h.closedByEmail || "—"}
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
