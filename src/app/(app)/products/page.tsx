import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { Card, EmptyState, PageHeader, Table } from "@/components/ui";
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
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {canWrite && (
          <Card className="h-fit lg:col-span-1">
            <h2 className="mb-4 text-sm font-semibold">Nuevo producto</h2>
            <ProductForm />
          </Card>
        )}
        <div className={canWrite ? "lg:col-span-2" : "lg:col-span-3"}>
          {products.length === 0 ? (
            <EmptyState message="Aún no hay productos ni servicios en el catálogo." />
          ) : (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 sm:px-4 text-left font-medium text-slate-600">SKU</th>
                  <th className="px-3 py-3 sm:px-4 text-left font-medium text-slate-600">Nombre</th>
                  <th className="px-3 py-3 sm:px-4 text-right font-medium text-slate-600">Precio</th>
                  <th className="px-3 py-3 sm:px-4 text-right font-medium text-slate-600">IVA</th>
                  <th className="px-3 py-3 sm:px-4 text-right font-medium text-slate-600">Stock</th>
                  <th className="px-3 py-3 sm:px-4 text-left font-medium text-slate-600">Estado</th>
                  {canWrite && (
                    <th className="px-3 py-3 sm:px-4 text-right font-medium text-slate-600"></th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
