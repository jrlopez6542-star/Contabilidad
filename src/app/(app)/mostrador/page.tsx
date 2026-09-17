import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { InvoiceForm } from "@/app/(app)/invoices/new/form";

export default async function MostradorPage() {
  await requirePermission("invoices:write");
  const [customers, products] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Mostrador"
        subtitle="Venta rápida: cédula → escanear SKU → cobrar"
      />
      <InvoiceForm customers={customers} products={products} />
    </div>
  );
}
