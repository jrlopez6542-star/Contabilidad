import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { Card, EmptyState, PageHeader, Table } from "@/components/ui";
import { CustomerForm } from "./form";
import { CustomerEditRow } from "./edit-row";

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
            <EmptyState message="Aún no hay clientes. Registre el primero para facturar." />
          ) : (
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 sm:px-4 text-left font-medium text-slate-600">Nombre</th>
                  <th className="px-3 py-3 sm:px-4 text-left font-medium text-slate-600">NIT/CC</th>
                  <th className="px-3 py-3 sm:px-4 text-left font-medium text-slate-600">Correo</th>
                  <th className="px-3 py-3 sm:px-4 text-left font-medium text-slate-600">Teléfono</th>
                  {canWrite && (
                    <th className="px-3 py-3 sm:px-4 text-right font-medium text-slate-600"></th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <CustomerEditRow
                    key={c.id}
                    canWrite={canWrite}
                    customer={{
                      id: c.id,
                      name: c.name,
                      nit: c.nit,
                      email: c.email,
                      phone: c.phone,
                      address: c.address,
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
