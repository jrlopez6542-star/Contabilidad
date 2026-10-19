import { prisma } from "@/lib/prisma";
import { requirePermission, getSession } from "@/lib/auth";
import { can } from "@/lib/roles";
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

  return <CustomersList customers={list} canWrite={canWrite} />;
}
