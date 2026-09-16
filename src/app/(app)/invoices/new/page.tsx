import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { InvoiceForm } from "./form";

export default async function NewInvoicePage() {
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
        title="Nueva factura"
        subtitle="Cédula → productos → Efectivo/Transferencia. Sin DIAN."
      />
      <InvoiceForm customers={customers} products={products} />
    </div>
  );
}
