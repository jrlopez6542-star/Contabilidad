import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { bogotaDayRange, formatDateTimeBogota } from "@/lib/dates";
import { Badge, Button, Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { Prisma } from "@prisma/client";

const TYPE_LABELS: Record<string, string> = {
  in: "Entrada",
  out: "Salida",
  adjust: "Ajuste",
};

const TYPE_BADGE: Record<string, string> = {
  in: "bg-brand-100 text-brand dark:bg-brand-800 dark:text-brand-100",
  out: "bg-jam-50 text-jam dark:bg-jam/20 dark:text-jam-100",
  adjust: "bg-gold-50 text-amber-900 dark:bg-gold/15 dark:text-gold-100",
};

export default async function KardexPage({
  searchParams,
}: {
  searchParams?: {
    productId?: string;
    type?: string;
    from?: string;
    to?: string;
  };
}) {
  await requirePermission("products:read");

  const productId = (searchParams?.productId || "").trim();
  const type = (searchParams?.type || "").trim();
  const from = (searchParams?.from || "").trim();
  const to = (searchParams?.to || "").trim();

  const products = await prisma.product.findMany({
    where: { trackStock: true },
    orderBy: { name: "asc" },
    select: { id: true, sku: true, name: true },
  });

  const where: Prisma.StockMovementWhereInput = {};
  if (productId) where.productId = productId;
  if (type === "in" || type === "out" || type === "adjust") where.type = type;
  if (from || to) {
    where.createdAt = {};
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      where.createdAt.gte = bogotaDayRange(from).start;
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      where.createdAt.lt = bogotaDayRange(to).end;
    }
  }

  const movements = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 150,
    include: { product: { select: { sku: true, name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Kardex"
        subtitle="Historial de entradas, salidas y ajustes de inventario."
      />

      <Card className="mb-4 !p-3 sm:!p-4">
        <form
          method="get"
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <label className="min-w-0 flex-1 text-sm sm:min-w-[12rem]">
            <span className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-brand-100">
              Producto
            </span>
            <select
              name="productId"
              defaultValue={productId}
              className="w-full min-h-10 rounded-lg border border-slate-300 bg-surface px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 dark:border-brand-200/25 dark:text-brand-50 dark:focus:border-brand-200 dark:focus:ring-brand-800"
            >
              <option value="">Todos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:w-32">
            <span className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-brand-100">
              Tipo
            </span>
            <select
              name="type"
              defaultValue={type}
              className="w-full min-h-10 rounded-lg border border-slate-300 bg-surface px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 dark:border-brand-200/25 dark:text-brand-50 dark:focus:border-brand-200 dark:focus:ring-brand-800"
            >
              <option value="">Todos</option>
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
              <option value="adjust">Ajuste</option>
            </select>
          </label>
          <label className="text-sm sm:w-36">
            <span className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-brand-100">
              Desde
            </span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="w-full min-h-10 rounded-lg border border-slate-300 bg-surface px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 dark:border-brand-200/25 dark:text-brand-50 dark:focus:border-brand-200 dark:focus:ring-brand-800"
            />
          </label>
          <label className="text-sm sm:w-36">
            <span className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-brand-100">
              Hasta
            </span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="w-full min-h-10 rounded-lg border border-slate-300 bg-surface px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 dark:border-brand-200/25 dark:text-brand-50 dark:focus:border-brand-200 dark:focus:ring-brand-800"
            />
          </label>
          <Button type="submit" className="min-h-10 sm:px-4">
            Buscar
          </Button>
        </form>
      </Card>

      {movements.length === 0 ? (
        <EmptyState message="Sin movimientos con esos filtros." />
      ) : (
        <>
          <Table>
            <thead className="bg-slate-50 dark:bg-brand-900/40">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                  Fecha
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                  Producto
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                  Tipo
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                  Cantidad
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                  Stock res.
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                  Motivo / Ref
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-brand-200/10">
              {movements.map((m) => {
                const signed =
                  m.type === "out"
                    ? -m.quantity
                    : m.type === "in"
                      ? m.quantity
                      : m.stockAfter - m.stockBefore;
                const qtyLabel =
                  signed > 0 ? `+${signed}` : String(signed);
                const motivo = [m.reason, m.refNumber].filter(Boolean).join(" · ");
                return (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600 dark:text-brand-200 sm:px-4">
                      {formatDateTimeBogota(m.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 sm:px-4">
                      <Link
                        href={`/kardex?productId=${m.productId}`}
                        className="text-sm font-medium text-slate-900 hover:text-brand dark:text-brand-50 dark:hover:text-brand-100"
                      >
                        {m.product.name}
                      </Link>
                      <span className="ml-1 font-mono text-xs text-slate-400 dark:text-brand-200/70">
                        {m.product.sku}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 sm:px-4">
                      <Badge className={TYPE_BADGE[m.type] || "bg-slate-100 text-slate-600"}>
                        {TYPE_LABELS[m.type] || m.type}
                      </Badge>
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-medium tabular-nums sm:px-4 ${
                        signed < 0
                          ? "text-jam dark:text-jam-100"
                          : signed > 0
                            ? "text-brand dark:text-brand-100"
                            : "text-slate-700 dark:text-brand-100"
                      }`}
                    >
                      {qtyLabel}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-brand-100 sm:px-4">
                      {m.stockAfter}
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-2.5 text-sm text-slate-600 dark:text-brand-200 sm:px-4">
                      {motivo || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <p className="mt-2 text-xs text-slate-400 dark:text-brand-200/70">
            Hasta 150 movimientos más recientes.
          </p>
        </>
      )}
    </div>
  );
}
