import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { formatCOP } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { ProductForm } from "./form";
import { ToggleProductButton } from "./toggle";

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
            ? "Catálogo con SKU, precio e IVA (19% por defecto)"
            : "Catálogo (solo lectura)"
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {canWrite && (
          <Card className="lg:col-span-1 h-fit">
            <h2 className="mb-4 text-sm font-semibold">Nuevo producto</h2>
            <ProductForm />
          </Card>
        )}
        <div className={canWrite ? "lg:col-span-2" : "lg:col-span-3"}>
          {products.length === 0 ? (
            <EmptyState message="No hay productos. Cree el primero." />
          ) : (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">SKU</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nombre</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Precio</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">IVA</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                  {canWrite && (
                    <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3">{p.name}</td>
                    <td className="px-4 py-3 text-right">{formatCOP(p.price)}</td>
                    <td className="px-4 py-3 text-right">{p.ivaRate}%</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          p.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {p.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <ToggleProductButton id={p.id} active={p.active} />
                      </td>
                    )}
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
