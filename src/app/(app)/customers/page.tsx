import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
import { Card, PageHeader } from "@/components/ui";
import { CustomerForm } from "./form";
import { CustomersList } from "./customers-list";

export default async function CustomersPage() {
  await requirePermission("customers:read");
  const session = await getSession();
  const canWrite = session ? can(session.role, "customers:write") : false;
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { invoices: true } },
    },
  });

  const list = customers.map((c) => ({
    id: c.id,
    name: c.name,
    nit: c.nit,
    email: c.email,
    phone: c.phone,
    address: c.address,
    invoiceCount: c._count.invoices,
  }));

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
          <CustomersList customers={list} canWrite={canWrite} />
        </div>
      </div>
    </div>
  );
}
