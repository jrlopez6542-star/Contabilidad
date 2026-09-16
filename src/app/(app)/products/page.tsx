import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { Card, EmptyState, LinkButton, PageHeader, Table } from "@/components/ui";
import { ProductForm } from "./form";
import { ProductEditRow } from "./edit-row";

export default async function ProductsPage() {
  await requirePermission("products:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "products:write") : false;
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        title="Productos y servicios"
        subtitle={
          canWrite
            ? "Catálogo con SKU, precio, IVA e inventario"
            : "Catálogo (solo lectura)"
        }
        actions={
          <LinkButton href="/kardex" variant="secondary" className="w-full sm:w-auto">
            Ver kardex
          </LinkButton>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {canWrite && (
          <Card className="h-fit !p-4 lg:col-span-1">
            <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-brand-100">
              Nuevo producto
            </h2>
            <ProductForm />
          </Card>
        )}
        <div className={canWrite ? "lg:col-span-2" : "lg:col-span-3"}>
          {products.length === 0 ? (
            <EmptyState message="Aún no hay productos ni servicios en el catálogo." />
          ) : (
            <Table>
              <thead className="bg-slate-50 dark:bg-brand-900/40">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    SKU
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Nombre
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Precio
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    IVA
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Stock
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4">
                    Estado
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 dark:text-brand-200 sm:px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-brand-200/10">
                {products.map((p) => (
                  <ProductEditRow
                    key={p.id}
                    canWrite={canWrite}
                    product={{
                      id: p.id,
                      sku: p.sku,
                      name: p.name,
                      price: p.price,
                      ivaRate: p.ivaRate,
                      stock: p.stock,
                      minStock: p.minStock,
                      trackStock: p.trackStock,
                      active: p.active,
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
