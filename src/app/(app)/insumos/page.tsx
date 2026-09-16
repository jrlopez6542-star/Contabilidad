import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { AlertBanner, Card, EmptyState, PageHeader, Table } from "@/components/ui";
import Link from "next/link";
import { SupplyForm } from "./form";
import { SupplyEditRow } from "./edit-row";

export default async function InsumosPage() {
  await requirePermission("supplies:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "supplies:write") : false;
  const supplies = await prisma.supply.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const lowStockSupplies = supplies.filter(
    (s) => s.active && s.minStock > 0 && s.quantity <= s.minStock
  );
  const lowPackagingSupplies = lowStockSupplies.filter((s) =>
    ["C4", "C10"].includes(s.code)
  );

  return (
    <div>
      <PageHeader
        title="Insumos"
        subtitle={
          canWrite
            ? "Materias primas e insumos de buñuelos (aparte de productos de venta). Las ventas de productos C4*/C10* descuentan automáticamente cajas C4/C10."
            : "Materias primas e insumos (solo lectura). Las ventas C4*/C10* descuentan empaque C4/C10."
        }
      />
      {lowStockSupplies.length > 0 && (
        <div className="mb-6">
          <AlertBanner
            tone="warning"
            title={
              lowPackagingSupplies.length > 0
                ? "Aviso: quedan 100 o menos cajas de empaque"
                : "Aviso de stock mínimo"
            }
          >
            {lowPackagingSupplies.length > 0 && (
              <p className="font-medium">
                Cajas: {lowPackagingSupplies
                  .map((s) => `${s.name}: ${s.quantity} (mín. ${s.minStock})`)
                  .join(" · ")}
              </p>
            )}
            <ul className="mt-1 list-inside list-disc">
              {lowStockSupplies.map((s) => (
                <li key={s.id}>
                  <Link href="#insumos" className="underline">
                    {s.code} — {s.name}
                  </Link>{" "}
                  · quedan {s.quantity} (mín. {s.minStock})
                </li>
              ))}
            </ul>
          </AlertBanner>
        </div>
      )}
      <div id="insumos" className="grid gap-4 lg:grid-cols-3">
        {canWrite && (
          <Card className="h-fit !p-4 lg:col-span-1">
            <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-brand-100">
              Nuevo insumo
            </h2>
            <SupplyForm />
          </Card>
        )}
        <div className={canWrite ? "lg:col-span-2" : "lg:col-span-3"}>
          {supplies.length === 0 ? (
            <EmptyState message="Aún no hay insumos. Registra harina, queso, salsas, aceites, empaques y otras materias primas aquí — aparte del catálogo de productos de venta." />
          ) : (
            <Table>
              <thead className="bg-slate-50 dark:bg-brand-900/40">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Código
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Nombre
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Categoría
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Cantidad
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Mín.
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Costo
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Estado
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-brand-200/10">
                {supplies.map((s) => (
                  <SupplyEditRow
                    key={s.id}
                    canWrite={canWrite}
                    supply={{
                      id: s.id,
                      code: s.code,
                      name: s.name,
                      category: s.category,
                      unit: s.unit,
                      quantity: s.quantity,
                      minStock: s.minStock,
                      unitCost: s.unitCost,
                      notes: s.notes,
                      active: s.active,
                    }}
                  />
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
