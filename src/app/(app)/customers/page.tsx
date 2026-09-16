import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { CustomerForm } from "./form";

export default async function CustomersPage() {
  await requirePermission("customers:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "customers:write") : false;
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={
          canWrite ? "NIT/CC, contacto y dirección" : "Clientes (solo lectura)"
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {canWrite && (
          <Card className="h-fit lg:col-span-1">
            <h2 className="mb-4 text-sm font-semibold">Nuevo cliente</h2>
            <CustomerForm />
          </Card>
        )}
        <div className={canWrite ? "lg:col-span-2" : "lg:col-span-3"}>
          {customers.length === 0 ? (
            <EmptyState message="No hay clientes registrados." />
          ) : (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">NIT/CC</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Correo</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Teléfono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      {c.address && (
                        <p className="text-xs text-slate-500">{c.address}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{c.nit}</td>
                    <td className="px-4 py-3">{c.email || "—"}</td>
                    <td className="px-4 py-3">{c.phone || "—"}</td>
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
