import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { formatCOP } from "@/lib/format";
import Link from "next/link";

export default async function TopProductosPage() {
  await requirePermission("reports:read");

  const groups = await prisma.invoiceItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      invoice: { status: { in: ["issued", "paid"] } },
    },
    _sum: {
      quantity: true,
      lineTotal: true,
    },
    orderBy: {
      _sum: {
        quantity: "desc",
      },
    },
    take: 30,
  });

  const productIds = groups
    .map((g) => g.productId)
    .filter((id): id is string => Boolean(id));

  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true },
      })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const ranked = groups.map((g) => {
    const p = g.productId ? productMap.get(g.productId) : null;
    return {
      key: g.productId || "unknown",
      label: p?.name || "Producto desconocido",
      sku: p?.sku || "—",
      qty: g._sum.quantity || 0,
      total: g._sum.lineTotal || 0,
    };
  });

  const maxQty = ranked[0]?.qty || 1;

  return (
    <div>
      <PageHeader
        title="Productos más vendidos"
        subtitle="Agregado de ítems en facturas emitidas o pagadas (solo lectura)."
        actions={
          <Link
            href="/reports"
            className="text-sm font-medium text-brand hover:underline dark:text-brand-100"
          >
            Ver reportes
          </Link>
        }
      />

      {ranked.length === 0 ? (
        <EmptyState message="Aún no hay ventas con productos para mostrar." />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <ol className="divide-y divide-brand/10 dark:divide-brand-200/10">
            {ranked.map((row, idx) => {
              const pct = Math.max(4, Math.round((row.qty / maxQty) * 100));
              return (
                <li key={row.key} className="px-4 py-3 sm:px-5">
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="text-sm font-medium text-slate-900 dark:text-brand-100">
                      {idx + 1}. {row.label}{" "}
                      <span className="font-normal text-slate-400">
                        ({row.sku})
                      </span>
                    </span>
                    <span className="text-xs tabular-nums text-slate-500 dark:text-brand-200">
                      {row.qty} uds · {formatCOP(row.total)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand/10 dark:bg-brand-800">
                    <div
                      className="h-full rounded-full bg-brand/70 dark:bg-gold"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </div>
  );
}
